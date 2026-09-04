from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.models.project import Project
from app.models.node import Node
from app.models.board import Board
from sqlalchemy.orm import selectinload
from app.schemas.user import UserResponse
from app.middleware.auth_middleware import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])

class AdminStatsResponse(BaseModel):
    total_users: int
    total_workspaces: int
    total_projects: int
    total_nodes: int

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    users_count = await db.execute(select(func.count(User.id)))
    workspaces_count = await db.execute(select(func.count(Workspace.id)))
    projects_count = await db.execute(select(func.count(Project.id)))
    nodes_count = await db.execute(select(func.count(Node.id)))

    return AdminStatsResponse(
        total_users=users_count.scalar() or 0,
        total_workspaces=workspaces_count.scalar() or 0,
        total_projects=projects_count.scalar() or 0,
        total_nodes=nodes_count.scalar() or 0
    )


@router.get("/users", response_model=List[UserResponse])
async def list_all_users(
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


@router.put("/users/{user_id}/role")
async def toggle_user_role(
    user_id: str,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    if current_admin.id == user_id:
        raise HTTPException(status_code=400, detail="Kendi yetkinizi değiştiremezsiniz")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    user.is_admin = not user.is_admin
    await db.commit()
    return {"message": "Kullanıcı yetkisi güncellendi", "is_admin": user.is_admin}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    if current_admin.id == user_id:
        raise HTTPException(status_code=400, detail="Kendi hesabınızı buradan silemezsiniz")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    await db.delete(user)
    await db.commit()
    return {"message": "Kullanıcı başarıyla silindi"}


from app.services.auth_service import hash_password

class ResetPasswordRequest(BaseModel):
    new_password: str

@router.put("/users/{user_id}/password")
async def reset_user_password(
    user_id: str,
    data: ResetPasswordRequest,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    user.password_hash = hash_password(data.new_password)
    await db.commit()
    return {"message": "Kullanıcının şifresi başarıyla sıfırlandı"}


@router.get("/content/tree")
async def get_content_tree(
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Workspace)
        .options(
            selectinload(Workspace.owner),
            selectinload(Workspace.projects).selectinload(Project.boards),
            selectinload(Workspace.boards)
        )
        .order_by(Workspace.created_at.desc())
    )
    workspaces = result.scalars().all()
    
    data = []
    for ws in workspaces:
        ws_data = {
            "id": ws.id,
            "name": ws.name,
            "owner": {"id": ws.owner.id, "display_name": ws.owner.display_name, "username": ws.owner.username} if ws.owner else None,
            "created_at": ws.created_at.isoformat() if ws.created_at else None,
            "projects": [],
            "boards_without_project": []
        }
        
        for proj in ws.projects:
            proj_data = {
                "id": proj.id,
                "name": proj.name,
                "created_at": proj.created_at.isoformat() if proj.created_at else None,
                "boards": [
                    {"id": b.id, "name": b.name, "created_at": b.created_at.isoformat() if b.created_at else None} for b in proj.boards
                ]
            }
            ws_data["projects"].append(proj_data)
            
        for b in ws.boards:
            if getattr(b, 'project_id', None) is None:
                ws_data["boards_without_project"].append({
                    "id": b.id, "name": b.name, "created_at": b.created_at.isoformat() if b.created_at else None
                })
        
        data.append(ws_data)
        
    return data


@router.delete("/workspaces/{workspace_id}")
async def admin_delete_workspace(
    workspace_id: str,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Çalışma alanı bulunamadı")
    await db.delete(ws)
    await db.commit()
    return {"message": "Çalışma alanı başarıyla silindi"}


@router.delete("/projects/{project_id}")
async def admin_delete_project(
    project_id: str,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    proj = result.scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    await db.delete(proj)
    await db.commit()
    return {"message": "Proje başarıyla silindi"}


@router.delete("/boards/{board_id}")
async def admin_delete_board(
    board_id: str,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Board).where(Board.id == board_id))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Pano bulunamadı")
    await db.delete(b)
    await db.commit()
    return {"message": "Pano başarıyla silindi"}
