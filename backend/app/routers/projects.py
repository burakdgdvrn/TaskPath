from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.workspace import WorkspaceMember
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.middleware.auth_middleware import get_current_user
from app.routers.websockets import manager

router = APIRouter(prefix="/api/workspaces/{workspace_id}/projects", tags=["projects"])


async def check_workspace_access(workspace_id: str, user_id: str, db: AsyncSession):
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if user and user.is_admin:
        return

    result = await db.execute(
        select(WorkspaceMember)
        .where(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Bu çalışma alanına erişiminiz yok")


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await check_workspace_access(workspace_id, current_user.id, db)
    result = await db.execute(select(Project).where(Project.workspace_id == workspace_id))
    return result.scalars().all()


@router.post("", response_model=ProjectResponse)
async def create_project(
    workspace_id: str,
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await check_workspace_access(workspace_id, current_user.id, db)
    
    project = Project(
        workspace_id=workspace_id,
        name=data.name,
        description=data.description,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    
    await manager.broadcast_to_workspace(workspace_id, {"type": "REFRESH_WORKSPACE"}, db)
    
    return project


@router.delete("/{project_id}")
async def delete_project(
    workspace_id: str,
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await check_workspace_access(workspace_id, current_user.id, db)
    
    result = await db.execute(select(Project).where(Project.id == project_id, Project.workspace_id == workspace_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
        
    await db.delete(project)
    await db.commit()
    
    await manager.broadcast_to_workspace(workspace_id, {"type": "REFRESH_WORKSPACE"}, db)
    
    return {"message": "Proje silindi"}

@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    workspace_id: str,
    project_id: str,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await check_workspace_access(workspace_id, current_user.id, db)
    
    result = await db.execute(select(Project).where(Project.id == project_id, Project.workspace_id == workspace_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
        
    if data.name is not None:
        project.name = data.name
    if data.description is not None:
        project.description = data.description
        
    await db.commit()
    await db.refresh(project)
    
    await manager.broadcast_to_workspace(workspace_id, {"type": "REFRESH_WORKSPACE"}, db)
    
    return project
