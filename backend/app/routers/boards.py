from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.board import Board
from app.models.workspace import WorkspaceMember
from app.schemas.board import BoardCreate, BoardUpdate, BoardResponse
from app.middleware.auth_middleware import get_current_user
from app.routers.websockets import manager

router = APIRouter(prefix="/api/workspaces/{workspace_id}/boards", tags=["boards"])


async def check_workspace_access(workspace_id: str, user_id: str, db: AsyncSession):
    result = await db.execute(
        select(WorkspaceMember)
        .where(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Bu çalışma alanına erişiminiz yok")


@router.get("", response_model=list[BoardResponse])
async def list_boards(
    workspace_id: str,
    project_id: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await check_workspace_access(workspace_id, current_user.id, db)
    
    query = select(Board).where(Board.workspace_id == workspace_id)
    if project_id:
        query = query.where(Board.project_id == project_id)
    else:
        # Optionally, get only boards without a project if project_id is None, 
        # but usually we might want all if project_id is not provided.
        # Let's say if no project_id is given, we just get all boards in the workspace.
        pass
        
    result = await db.execute(query.order_by(Board.updated_at.desc()))
    boards = result.scalars().all()
    return boards


@router.get("/{board_id}", response_model=BoardResponse)
async def get_board(
    workspace_id: str,
    board_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await check_workspace_access(workspace_id, current_user.id, db)
    
    result = await db.execute(select(Board).where(Board.id == board_id, Board.workspace_id == workspace_id))
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(status_code=404, detail="Board bulunamadı")
    return board


@router.post("", response_model=BoardResponse, status_code=201)
async def create_board(
    workspace_id: str,
    data: BoardCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await check_workspace_access(workspace_id, current_user.id, db)
    
    board = Board(
        workspace_id=workspace_id,
        project_id=data.project_id,
        name=data.name,
        description=data.description,
    )
    db.add(board)
    await db.commit()
    await db.refresh(board)
    
    await manager.broadcast_to_workspace(workspace_id, {"type": "REFRESH_WORKSPACE"}, db)
    
    return board


@router.patch("/{board_id}", response_model=BoardResponse)
async def update_board(
    workspace_id: str,
    board_id: str,
    data: BoardUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await check_workspace_access(workspace_id, current_user.id, db)
    
    result = await db.execute(select(Board).where(Board.id == board_id, Board.workspace_id == workspace_id))
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(status_code=404, detail="Board bulunamadı")

    if data.name is not None:
        board.name = data.name
    if data.description is not None:
        board.description = data.description
    if data.project_id is not None:
        # Check if they are removing from project (empty string or "null" depending on frontend)
        # We'll assume empty string means None
        if data.project_id == "":
            board.project_id = None
        else:
            board.project_id = data.project_id

    await db.commit()
    await db.refresh(board)
    
    await manager.broadcast_to_workspace(workspace_id, {"type": "REFRESH_WORKSPACE"}, db)
    
    return board


@router.delete("/{board_id}", status_code=204)
async def delete_board(
    workspace_id: str,
    board_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Depending on rules, maybe only workspace owner can delete, or anyone.
    # The spec says "flat permissions", so any member can delete.
    await check_workspace_access(workspace_id, current_user.id, db)
    
    result = await db.execute(select(Board).where(Board.id == board_id, Board.workspace_id == workspace_id))
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(status_code=404, detail="Board bulunamadı")

    await db.delete(board)
    await db.commit()
    
    await manager.broadcast_to_workspace(workspace_id, {"type": "REFRESH_WORKSPACE"}, db)
    
    return {"message": "Board silindi"}
