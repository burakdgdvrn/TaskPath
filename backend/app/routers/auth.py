import random
import uuid
import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse, UserUpdate, UserPasswordUpdate, UserDeleteRequest
from app.services.auth_service import hash_password, verify_password, create_access_token
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

AVATAR_COLORS = ["#8b5cf6", "#2dd4bf", "#f59e0b", "#f43f5e", "#38bdf8", "#10b981"]

async def generate_unique_username(db: AsyncSession, display_name: str) -> str:
    # Convert to lowercase and keep only alphanumeric chars
    base = display_name.lower()
    base = re.sub(r'[^a-z0-9]', '', base)
    if not base:
        base = "user"
    
    while True:
        suffix = str(uuid.uuid4())[:6]
        username = f"{base}_{suffix}"
        result = await db.execute(select(User).where(User.username == username))
        if not result.scalar_one_or_none():
            return username


@router.post("/register", response_model=TokenResponse)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check email
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Bu email zaten kayıtlı")

    unique_username = await generate_unique_username(db, data.display_name)

    user = User(
        username=unique_username,
        email=data.email,
        display_name=data.display_name,
        password_hash=hash_password(data.password),
        avatar_color=random.choice(AVATAR_COLORS),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Auto-create a personal workspace for the user
    personal_workspace = Workspace(
        name="Kişisel Alanım",
        description="Özel projelerim ve fikirlerim",
        owner_id=user.id,
    )
    db.add(personal_workspace)
    await db.commit()
    await db.refresh(personal_workspace)

    # Add user as owner of the workspace
    member = WorkspaceMember(workspace_id=personal_workspace.id, user_id=user.id, role="owner")
    db.add(member)
    await db.commit()

    token = create_access_token({"sub": user.id})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")

    token = create_access_token({"sub": user.id})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.display_name is not None:
        current_user.display_name = data.display_name
    if data.avatar_base64 is not None:
        current_user.avatar_base64 = data.avatar_base64
    
    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.patch("/me/password")
async def update_password(
    data: UserPasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Mevcut şifre hatalı")
    
    current_user.password_hash = hash_password(data.new_password)
    await db.commit()
    
    return {"message": "Şifre başarıyla güncellendi"}



@router.get("/users", response_model=list[UserResponse])
async def list_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Tüm kullanıcıları listele (arkadaşlarını davet ederken kullanılır)"""
    result = await db.execute(select(User))
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


@router.delete("/me")
async def delete_account(
    data: UserDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Şifre hatalı")
    
    await db.delete(current_user)
    await db.commit()
    
    return {"message": "Hesabınız başarıyla silindi"}
