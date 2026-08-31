from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from app.database import get_db
from app.models.user import User
from app.models.message import Message
from app.schemas.chat import MessageCreate, MessageResponse, MessageEdit
from app.middleware.auth_middleware import get_current_user
from app.services.security import encrypt_message, decrypt_message
from app.routers.websockets import manager
import json
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/chat", tags=["chat"])

def build_message_response(msg: Message, sender: User) -> MessageResponse:
    return MessageResponse(
        id=msg.id,
        sender_id=msg.sender_id,
        receiver_id=msg.receiver_id,
        workspace_id=msg.workspace_id,
        content=decrypt_message(msg.encrypted_content),
        is_read=msg.is_read,
        created_at=msg.created_at,
        sender_display_name=sender.display_name,
        sender_avatar_color=sender.avatar_color,
        sender_avatar_base64=sender.avatar_base64,
        is_edited=msg.is_edited,
        is_deleted=msg.is_deleted
    )

@router.get("/direct/{friend_id}", response_model=list[MessageResponse])
async def get_direct_messages(
    friend_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Message, User).join(User, Message.sender_id == User.id).where(
            Message.workspace_id.is_(None),
            or_(
                and_(Message.sender_id == current_user.id, Message.receiver_id == friend_id, Message.sender_deleted == False),
                and_(Message.sender_id == friend_id, Message.receiver_id == current_user.id, Message.receiver_deleted == False)
            )
        ).order_by(Message.created_at)
    )
    
    rows = result.all()
    return [build_message_response(msg, sender) for msg, sender in rows]


@router.delete("/direct/{friend_id}/clear")
async def clear_direct_messages(
    friend_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import update, delete
    
    # Mark messages sent by current_user as deleted for sender
    await db.execute(
        update(Message).where(
            Message.workspace_id.is_(None),
            Message.sender_id == current_user.id,
            Message.receiver_id == friend_id
        ).values(sender_deleted=True)
    )
    
    # Mark messages received by current_user as deleted for receiver
    await db.execute(
        update(Message).where(
            Message.workspace_id.is_(None),
            Message.sender_id == friend_id,
            Message.receiver_id == current_user.id
        ).values(receiver_deleted=True)
    )
    
    # Permanently delete messages where BOTH users have deleted them
    await db.execute(
        delete(Message).where(
            Message.workspace_id.is_(None),
            or_(
                and_(Message.sender_id == current_user.id, Message.receiver_id == friend_id),
                and_(Message.sender_id == friend_id, Message.receiver_id == current_user.id)
            ),
            Message.sender_deleted == True,
            Message.receiver_deleted == True
        )
    )
    
    await db.commit()
    return {"status": "success"}


@router.post("/direct/{friend_id}", response_model=MessageResponse)
async def send_direct_message(
    friend_id: str,
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    encrypted = encrypt_message(data.content)
    msg = Message(
        sender_id=current_user.id,
        receiver_id=friend_id,
        workspace_id=None,
        encrypted_content=encrypted
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    
    # Real-time update
    resp = build_message_response(msg, current_user)
    payload = {"type": "chat:receive", "message": resp.model_dump(mode="json")}
    
    await manager.send_personal_message(payload, friend_id)
    # Also send to self (in case of multiple tabs)
    await manager.send_personal_message(payload, current_user.id)
    
    return resp

@router.get("/workspace/{workspace_id}", response_model=list[MessageResponse])
async def get_workspace_messages(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Usually we'd check if user is a member of this workspace. 
    # For now, keeping it simple.
    result = await db.execute(
        select(Message, User).join(User, Message.sender_id == User.id).where(
            Message.workspace_id == workspace_id
        ).order_by(Message.created_at)
    )
    
    rows = result.all()
    return [build_message_response(msg, sender) for msg, sender in rows]


@router.post("/workspace/{workspace_id}", response_model=MessageResponse)
async def send_workspace_message(
    workspace_id: str,
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    encrypted = encrypt_message(data.content)
    msg = Message(
        sender_id=current_user.id,
        receiver_id=None,
        workspace_id=workspace_id,
        encrypted_content=encrypted
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    
    # Real-time update
    resp = build_message_response(msg, current_user)
    payload = {"type": "chat:receive", "message": resp.model_dump(mode="json")}
    
    await manager.broadcast_to_workspace(workspace_id, payload, db)
    
    return resp

@router.patch("/message/{message_id}", response_model=MessageResponse)
async def edit_message(
    message_id: str,
    data: MessageEdit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Message).where(Message.id == message_id))
    msg = result.scalar_one_or_none()
    
    if not msg:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
        
    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sadece kendi mesajlarınızı düzenleyebilirsiniz")
        
    if msg.is_deleted:
        raise HTTPException(status_code=400, detail="Silinmiş bir mesajı düzenleyemezsiniz")
        
    # Check 15 min limit
    if datetime.utcnow() - msg.created_at > timedelta(minutes=15):
        raise HTTPException(status_code=400, detail="Mesajlar sadece ilk 15 dakika içinde düzenlenebilir")
        
    msg.encrypted_content = encrypt_message(data.content)
    msg.is_edited = True
    await db.commit()
    await db.refresh(msg)
    
    resp = build_message_response(msg, current_user)
    payload = {"type": "chat:update", "message": resp.model_dump(mode="json")}
    
    if msg.workspace_id:
        await manager.broadcast_to_workspace(msg.workspace_id, payload, db)
    elif msg.receiver_id:
        await manager.send_personal_message(payload, msg.receiver_id)
        await manager.send_personal_message(payload, current_user.id)
        
    return resp


@router.delete("/message/{message_id}")
async def delete_message_for_everyone(
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Message).where(Message.id == message_id))
    msg = result.scalar_one_or_none()
    
    if not msg:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
        
    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sadece kendi mesajlarınızı silebilirsiniz")
        
    if msg.is_deleted:
        return {"status": "success"} # Zaten silinmiş
        
    # Check 15 min limit
    if datetime.utcnow() - msg.created_at > timedelta(minutes=15):
        raise HTTPException(status_code=400, detail="Mesajlar sadece ilk 15 dakika içinde herkesten silinebilir")
        
    msg.is_deleted = True
    # İçeriği sıfırla ki veritabanında bile kalmasın
    msg.encrypted_content = encrypt_message("")
    await db.commit()
    await db.refresh(msg)
    
    resp = build_message_response(msg, current_user)
    payload = {"type": "chat:update", "message": resp.model_dump(mode="json")}
    
    if msg.workspace_id:
        await manager.broadcast_to_workspace(msg.workspace_id, payload, db)
    elif msg.receiver_id:
        await manager.send_personal_message(payload, msg.receiver_id)
        await manager.send_personal_message(payload, current_user.id)
        
    return {"status": "success"}
