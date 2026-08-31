from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.user import User
from app.models.invite import WorkspaceInvite
from app.models.workspace import WorkspaceMember
from app.schemas.invite import InviteCreateRequest, InviteResponse
from app.middleware.auth_middleware import get_current_user
from app.routers.websockets import manager

router = APIRouter(prefix="/api/invites", tags=["invites"])


@router.get("/me", response_model=list[InviteResponse])
async def list_my_invites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WorkspaceInvite)
        .where(WorkspaceInvite.receiver_id == current_user.id, WorkspaceInvite.status == "pending")
        .options(
            selectinload(WorkspaceInvite.workspace),
            selectinload(WorkspaceInvite.sender),
            selectinload(WorkspaceInvite.receiver)
        )
    )
    return result.scalars().all()


@router.post("/workspace/{workspace_id}")
async def send_invite(
    workspace_id: str,
    data: InviteCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check if sender is in workspace
    sender_mem = await db.execute(
        select(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == current_user.id)
    )
    if not sender_mem.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Bu çalışma alanında değilsiniz")
        
    # Find user by username or email
    user_res = await db.execute(
        select(User).where(
            (User.username == data.username) | (User.email == data.username)
        )
    )
    receiver = user_res.scalar_one_or_none()
    
    if not receiver:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
    if receiver.id == current_user.id:
        raise HTTPException(status_code=400, detail="Kendinizi davet edemezsiniz")
        
    # Check if already member
    existing_mem = await db.execute(
        select(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == receiver.id)
    )
    if existing_mem.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Bu kullanıcı zaten alanın üyesi")
        
    # Check if pending invite exists
    existing_inv = await db.execute(
        select(WorkspaceInvite).where(
            WorkspaceInvite.workspace_id == workspace_id, 
            WorkspaceInvite.receiver_id == receiver.id,
            WorkspaceInvite.status == "pending"
        )
    )
    if existing_inv.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Bu kullanıcıya zaten davet gönderilmiş")
        
    invite = WorkspaceInvite(
        workspace_id=workspace_id,
        sender_id=current_user.id,
        receiver_id=receiver.id
    )
    db.add(invite)
    await db.commit()
    
    # Notify receiver
    await manager.send_personal_message({"type": "REFRESH_INVITES"}, receiver.id)
    
    return {"message": "Davet gönderildi"}


@router.post("/{invite_id}/accept")
async def accept_invite(
    invite_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    inv_res = await db.execute(select(WorkspaceInvite).where(WorkspaceInvite.id == invite_id))
    invite = inv_res.scalar_one_or_none()
    
    if not invite or invite.receiver_id != current_user.id or invite.status != "pending":
        raise HTTPException(status_code=404, detail="Geçerli bir davet bulunamadı")
        
    invite.status = "accepted"
    
    # Add member
    member = WorkspaceMember(workspace_id=invite.workspace_id, user_id=current_user.id)
    db.add(member)
    
    await db.commit()
    
    # Notify sender that invite was accepted (optional, but good)
    await manager.send_personal_message({"type": "REFRESH_WORKSPACE"}, invite.sender_id)
    # Notify receiver to update workspaces
    await manager.send_personal_message({"type": "REFRESH_WORKSPACE"}, current_user.id)
    
    return {"message": "Davet kabul edildi", "workspace_id": invite.workspace_id}


@router.post("/{invite_id}/reject")
async def reject_invite(
    invite_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    inv_res = await db.execute(select(WorkspaceInvite).where(WorkspaceInvite.id == invite_id))
    invite = inv_res.scalar_one_or_none()
    
    if not invite or invite.receiver_id != current_user.id or invite.status != "pending":
        raise HTTPException(status_code=404, detail="Geçerli bir davet bulunamadı")
        
    invite.status = "rejected"
    await db.commit()
    
    # Notify sender
    await manager.send_personal_message({"type": "REFRESH_INVITES"}, invite.sender_id)
    
    return {"message": "Davet reddedildi"}


@router.get("/workspace/{workspace_id}/invites", response_model=list[InviteResponse])
async def list_workspace_invites(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check if user is in workspace (preferably owner, but let's allow members for now)
    sender_mem = await db.execute(
        select(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == current_user.id)
    )
    if not sender_mem.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Bu çalışma alanında değilsiniz")

    result = await db.execute(
        select(WorkspaceInvite)
        .where(WorkspaceInvite.workspace_id == workspace_id)
        .options(
            selectinload(WorkspaceInvite.workspace),
            selectinload(WorkspaceInvite.sender),
            selectinload(WorkspaceInvite.receiver)
        )
    )
    return result.scalars().all()
