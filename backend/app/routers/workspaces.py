from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse
from app.middleware.auth_middleware import get_current_user
from app.routers.websockets import manager

router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])


@router.get("", response_model=list[WorkspaceResponse])
async def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workspace)
        .join(WorkspaceMember)
        .where(WorkspaceMember.user_id == current_user.id)
        .options(selectinload(Workspace.members).selectinload(WorkspaceMember.user))
    )
    return result.scalars().all()


@router.post("", response_model=WorkspaceResponse)
async def create_workspace(
    data: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace = Workspace(
        name=data.name,
        description=data.description,
        owner_id=current_user.id,
    )
    db.add(workspace)
    await db.flush()

    member = WorkspaceMember(workspace_id=workspace.id, user_id=current_user.id, role="owner")
    db.add(member)
    
    await db.commit()
    await db.refresh(workspace)
    
    result = await db.execute(
        select(Workspace)
        .where(Workspace.id == workspace.id)
        .options(selectinload(Workspace.members).selectinload(WorkspaceMember.user))
    )
    return result.scalar_one()


@router.delete("/{workspace_id}")
async def delete_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one_or_none()

    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace bulunamadı")

    if workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bunu sadece alan sahibi silebilir")

    await db.delete(workspace)
    await db.commit()
    return {"message": "Workspace silindi"}


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: str,
    data: WorkspaceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one_or_none()

    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace bulunamadı")

    if workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bunu sadece alan sahibi güncelleyebilir")

    if data.name is not None:
        workspace.name = data.name
    if data.description is not None:
        workspace.description = data.description

    await db.commit()
    await db.refresh(workspace)
    
    result = await db.execute(
        select(Workspace)
        .where(Workspace.id == workspace.id)
        .options(selectinload(Workspace.members).selectinload(WorkspaceMember.user))
    )
    return result.scalar_one()


@router.delete("/{workspace_id}/members/{user_id}")
async def remove_member(
    workspace_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace bulunamadı")
        
    if workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bunu sadece alan sahibi silebilir")
        
    if workspace.owner_id == user_id:
        raise HTTPException(status_code=400, detail="Alan sahibi silinemez")
        
    member_res = await db.execute(
        select(WorkspaceMember)
        .where(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user_id)
    )
    member = member_res.scalar_one_or_none()
    
    if not member:
        raise HTTPException(status_code=404, detail="Kullanıcı bu alanda değil")
        
    await db.delete(member)
    await db.commit()
    
    # Notify the removed user to refresh their workspaces
    await manager.send_personal_message({"type": "REFRESH_WORKSPACE"}, user_id)
    
    return {"message": "Kullanıcı çalışma alanından çıkarıldı"}
