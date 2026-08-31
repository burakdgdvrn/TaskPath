from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.models.node import Node
from app.models.board import Board
from app.models.workspace import WorkspaceMember

router = APIRouter(
    prefix="/api/search",
    tags=["Search"],
)


@router.get("")
async def search_nodes(
    q: str = Query(..., min_length=1),
    board_id: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Search nodes across boards the user has access to.
    """
    search_results = []

    # 1. Search Boards (only if we aren't filtering by a specific board_id)
    if not board_id:
        board_stmt = (
            select(Board)
            .join(WorkspaceMember, Board.workspace_id == WorkspaceMember.workspace_id)
            .where(WorkspaceMember.user_id == current_user.id)
            .where(
                or_(
                    Board.name.ilike(f"%{q}%"),
                    Board.description.ilike(f"%{q}%")
                )
            )
        )
        board_result = await db.execute(board_stmt)
        boards = board_result.scalars().all()
        for b in boards:
            search_results.append({
                "id": str(b.id),
                "type": "board",
                "label": b.name,
                "description": b.description,
                "board_name": "Pano",
            })

    # 2. Base query for nodes
    stmt = (
        select(Node, Board.name.label("board_name"))
        .join(Board, Node.board_id == Board.id)
        .join(WorkspaceMember, Board.workspace_id == WorkspaceMember.workspace_id)
        .where(WorkspaceMember.user_id == current_user.id)
    )
    
    # Text search on label or description
    stmt = stmt.where(
        or_(
            Node.label.ilike(f"%{q}%"),
            Node.description.ilike(f"%{q}%")
        )
    )

    # Filter by board_id if provided
    if board_id:
        stmt = stmt.where(Node.board_id == board_id)

    result = await db.execute(stmt)
    rows = result.all()

    # Format node response
    for node, board_name in rows:
        search_results.append({
            "id": str(node.id),
            "type": "node",
            "board_id": str(node.board_id),
            "board_name": board_name,
            "label": node.label,
            "description": node.description,
            "status": node.status,
            "node_type": node.node_type,
            "priority": node.priority,
            "position_x": node.position_x,
            "position_y": node.position_y,
            "tags": node.tags,
            "assigned_to": node.assigned_to,
        })

    return search_results
