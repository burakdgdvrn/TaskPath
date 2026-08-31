from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from app.database import get_db
from app.models.user import User
from app.models.friendship import Friendship, FriendshipStatus
from app.schemas.chat import FriendshipCreate, FriendshipResponse, FriendshipUpdate, FriendshipCreateUsername
from app.middleware.auth_middleware import get_current_user
from app.routers.websockets import manager
import json

router = APIRouter(prefix="/api/friends", tags=["friends"])

@router.get("", response_model=list[FriendshipResponse])
async def get_friends(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Friendship, User).join(
            User, 
            or_(
                and_(Friendship.requester_id == current_user.id, User.id == Friendship.receiver_id),
                and_(Friendship.receiver_id == current_user.id, User.id == Friendship.requester_id)
            )
        ).where(
            or_(Friendship.requester_id == current_user.id, Friendship.receiver_id == current_user.id)
        )
    )
    
    rows = result.all()
    friends = []
    for friendship, other_user in rows:
        resp = FriendshipResponse.model_validate(friendship)
        resp.friend_display_name = other_user.display_name
        resp.friend_email = other_user.email
        resp.friend_avatar_color = other_user.avatar_color
        resp.friend_avatar_base64 = other_user.avatar_base64
        friends.append(resp)
        
    return friends

@router.post("/request", response_model=FriendshipResponse)
async def send_friend_request(
    data: FriendshipCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if data.receiver_id == current_user.id:
        raise HTTPException(status_code=400, detail="Kendinize istek gönderemezsiniz")
        
    # Check if request already exists
    existing = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.requester_id == current_user.id, Friendship.receiver_id == data.receiver_id),
                and_(Friendship.requester_id == data.receiver_id, Friendship.receiver_id == current_user.id)
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Arkadaşlık isteği zaten var")

    friendship = Friendship(
        requester_id=current_user.id,
        receiver_id=data.receiver_id,
        status=FriendshipStatus.PENDING
    )
    db.add(friendship)
    await db.commit()
    await db.refresh(friendship)
    
    # Send WebSocket notification
    await manager.send_personal_message({"type": "friend:request"}, data.receiver_id)
    
    return FriendshipResponse.model_validate(friendship)

@router.post("/request-by-username", response_model=FriendshipResponse)
async def send_friend_request_by_username(
    data: FriendshipCreateUsername,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Find user by username or display_name
    result = await db.execute(select(User).where(User.username == data.username))
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Kendinize istek gönderemezsiniz")
        
    # Check if request already exists
    existing = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.requester_id == current_user.id, Friendship.receiver_id == target_user.id),
                and_(Friendship.requester_id == target_user.id, Friendship.receiver_id == current_user.id)
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Arkadaşlık isteği zaten var")

    friendship = Friendship(
        requester_id=current_user.id,
        receiver_id=target_user.id,
        status=FriendshipStatus.PENDING
    )
    db.add(friendship)
    await db.commit()
    await db.refresh(friendship)
    
    await manager.send_personal_message({"type": "friend:request"}, target_user.id)
    
    return FriendshipResponse.model_validate(friendship)

@router.patch("/{friendship_id}", response_model=FriendshipResponse)
async def update_friendship(
    friendship_id: str,
    data: FriendshipUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Friendship).where(Friendship.id == friendship_id))
    friendship = result.scalar_one_or_none()
    
    if not friendship:
        raise HTTPException(status_code=404, detail="Bulunamadı")
        
    if friendship.receiver_id != current_user.id and friendship.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Yetkiniz yok")

    if data.status == "accepted" and friendship.receiver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sadece alıcı kabul edebilir")

    friendship.status = data.status
    await db.commit()
    await db.refresh(friendship)
    
    # Notify the other person
    other_id = friendship.requester_id if friendship.receiver_id == current_user.id else friendship.receiver_id
    await manager.send_personal_message({"type": "friend:updated"}, other_id)
    
    return FriendshipResponse.model_validate(friendship)

@router.delete("/{friendship_id}", status_code=204)
async def remove_friend(
    friendship_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Friendship).where(Friendship.id == friendship_id))
    friendship = result.scalar_one_or_none()
    
    if not friendship:
        raise HTTPException(status_code=404, detail="Bulunamadı")
        
    if friendship.receiver_id != current_user.id and friendship.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Yetkiniz yok")

    other_id = friendship.requester_id if friendship.receiver_id == current_user.id else friendship.receiver_id
    await db.delete(friendship)
    await db.commit()
    
    await manager.send_personal_message({"type": "friend:updated"}, other_id)
