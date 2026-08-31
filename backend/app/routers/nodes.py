from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.node import Node
from app.models.edge import Edge
from app.models.board import Board
from app.models.workspace import WorkspaceMember
from app.models.notification import Notification
from app.schemas.node import NodeCreate, NodeUpdate, NodeResponse, EdgeCreate, EdgeResponse, AssignTreeRequest, NodeBulkUpdate, NodeBulkDelete, RoadmapImportRequest
from app.middleware.auth_middleware import get_current_user
from app.websockets.ws_manager import manager
from app.routers.websockets import manager as global_manager

router = APIRouter(prefix="/api", tags=["nodes & edges"])


async def _check_board_access(board_id: str, user: User, db: AsyncSession) -> Board:
    """Verify user has access to the board."""
    result = await db.execute(select(Board).where(Board.id == board_id))
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(status_code=404, detail="Board bulunamadı")

    # Check access: member of the workspace
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == board.workspace_id,
            WorkspaceMember.user_id == user.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Bu board'a erişiminiz yok")
    return board


# ──── NODES ────

@router.get("/boards/{board_id}/nodes", response_model=list[NodeResponse])
async def list_nodes(
    board_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_board_access(board_id, current_user, db)
    result = await db.execute(select(Node).where(Node.board_id == board_id, Node.is_deleted == False))
    return [NodeResponse.model_validate(n) for n in result.scalars().all()]


@router.post("/boards/{board_id}/nodes", response_model=NodeResponse, status_code=201)
async def create_node(
    board_id: str,
    data: NodeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_board_access(board_id, current_user, db)
    node = Node(
        board_id=board_id,
        label=data.label,
        description=data.description,
        node_type=data.node_type,
        priority=data.priority,
        position_x=data.position_x,
        position_y=data.position_y,
        tags=data.tags,
        assigned_to=data.assigned_to,
    )
    db.add(node)
    await db.commit()
    await db.refresh(node)
    return NodeResponse.model_validate(node)


@router.patch("/nodes/{node_id}", response_model=NodeResponse)
async def update_node(
    node_id: str,
    data: NodeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node bulunamadı")

    await _check_board_access(node.board_id, current_user, db)

    # Check if assignment changed
    old_assignee = node.assigned_to
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(node, key, value)

    if 'assigned_to' in update_data and update_data['assigned_to'] and update_data['assigned_to'] != old_assignee and update_data['assigned_to'] != current_user.id:
        notif = Notification(
            user_id=update_data['assigned_to'],
            sender_id=current_user.id,
            notification_type="node_assigned",
            title="Yeni Görev Atandı",
            message=f"{current_user.display_name} seni '{node.label}' görevine atadı."
        )
        db.add(notif)
        await global_manager.send_personal_message({"type": "REFRESH_INBOX"}, update_data['assigned_to'])

    await db.commit()
    await db.refresh(node)
    return NodeResponse.model_validate(node)


@router.patch("/boards/{board_id}/nodes/bulk", response_model=list[NodeResponse])
async def bulk_update_nodes(
    board_id: str,
    data: NodeBulkUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_board_access(board_id, current_user, db)
    
    if not data.node_ids:
        return []

    result = await db.execute(select(Node).where(Node.id.in_(data.node_ids), Node.board_id == board_id))
    nodes = result.scalars().all()
    
    notifications_sent = set()
    
    for node in nodes:
        if data.status is not None:
            node.status = data.status
        if data.priority is not None:
            node.priority = data.priority
        if data.assigned_to is not None:
            if data.assigned_to == "UNASSIGN":
                node.assigned_to = None
                node.is_tree_assigned = False
            else:
                old_assignee = node.assigned_to
                node.assigned_to = data.assigned_to
                
                if data.assigned_to != old_assignee and data.assigned_to != current_user.id:
                    notif = Notification(
                        user_id=data.assigned_to,
                        sender_id=current_user.id,
                        notification_type="node_assigned",
                        title="Yeni Görev Atandı",
                        message=f"{current_user.display_name} seni '{node.label}' görevine atadı."
                    )
                    db.add(notif)
                    notifications_sent.add(data.assigned_to)
                    
        if data.tags is not None:
            node.tags = data.tags
        if data.is_deleted is not None:
            node.is_deleted = data.is_deleted
            
    await db.commit()
    
    for user_id in notifications_sent:
        await global_manager.send_personal_message({"type": "REFRESH_INBOX"}, user_id)
    
    result = await db.execute(select(Node).where(Node.id.in_(data.node_ids)))
    updated_nodes = result.scalars().all()
    return [NodeResponse.model_validate(n) for n in updated_nodes]


@router.delete("/boards/{board_id}/nodes/bulk", status_code=204)
async def bulk_delete_nodes(
    board_id: str,
    data: NodeBulkDelete,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_board_access(board_id, current_user, db)
    
    if not data.node_ids:
        return

    edge_result = await db.execute(
        select(Edge).where(
            (Edge.source_id.in_(data.node_ids)) | (Edge.target_id.in_(data.node_ids))
        )
    )
    for edge in edge_result.scalars().all():
        edge.is_deleted = True

    node_result = await db.execute(select(Node).where(Node.id.in_(data.node_ids), Node.board_id == board_id))
    for node in node_result.scalars().all():
        node.is_deleted = True
        
    await db.commit()


@router.post("/boards/{board_id}/nodes/{node_id}/assign-tree", response_model=list[str])
async def assign_tree(
    board_id: str,
    node_id: str,
    data: AssignTreeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_board_access(board_id, current_user, db)
    
    edges_result = await db.execute(select(Edge).where(Edge.board_id == board_id))
    edges = edges_result.scalars().all()
    
    adj = {}
    for edge in edges:
        if edge.source_id not in adj:
            adj[edge.source_id] = []
        adj[edge.source_id].append(edge.target_id)
        
    queue = [node_id]
    visited = set([node_id])
    while queue:
        current = queue.pop(0)
        for child in adj.get(current, []):
            if child not in visited:
                visited.add(child)
                queue.append(child)
                
    visited_ids = list(visited)
    from sqlalchemy import update
    
    final_assignee = None if data.assignee_id == "UNASSIGN" or not data.assignee_id else data.assignee_id
    
    await db.execute(
        update(Node)
        .where(Node.id.in_(visited_ids))
        .values(assigned_to=final_assignee, is_tree_assigned=True if final_assignee else False)
    )
    if final_assignee and final_assignee != current_user.id:
        # Get the label of the starting node
        result_node = await db.execute(select(Node).where(Node.id == node_id))
        start_node = result_node.scalar_one_or_none()
        label = start_node.label if start_node else "Ağaçtaki"
        
        notif = Notification(
            user_id=final_assignee,
            sender_id=current_user.id,
            notification_type="tree_assigned",
            title="Görev Ağacı Atandı",
            message=f"{current_user.display_name} seni '{label}' ve alt görevlerine atadı."
        )
        db.add(notif)
        await global_manager.send_personal_message({"type": "REFRESH_INBOX"}, final_assignee)

    await db.commit()
    
    return visited_ids


@router.delete("/nodes/{node_id}", status_code=204)
async def delete_node(
    node_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node bulunamadı")

    await _check_board_access(node.board_id, current_user, db)

    # Also delete related edges
    edge_result = await db.execute(
        select(Edge).where((Edge.source_id == node_id) | (Edge.target_id == node_id))
    )
    for edge in edge_result.scalars().all():
        edge.is_deleted = True

    node.is_deleted = True
    await db.commit()


@router.post("/boards/{board_id}/import-roadmap", status_code=201)
async def import_roadmap(
    board_id: str,
    data: RoadmapImportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_board_access(board_id, current_user, db)
    
    from app.models.user import generate_uuid
    id_map = {}
    db_nodes = []
    
    for fn in data.nodes:
        new_id = generate_uuid()
        id_map[fn.id] = new_id
        db_node = Node(
            id=new_id,
            board_id=board_id,
            label=fn.label,
            description=fn.description,
            priority=fn.priority,
            tags=fn.tags,
            node_type=fn.node_type,
            position_x=fn.position_x,
            position_y=fn.position_y,
        )
        db_nodes.append(db_node)
        
    if db_nodes:
        db.add_all(db_nodes)
        
    db_edges = []
    for fe in data.edges:
        if fe.source_id in id_map and fe.target_id in id_map:
            db_edge = Edge(
                board_id=board_id,
                source_id=id_map[fe.source_id],
                target_id=id_map[fe.target_id],
                edge_type=fe.edge_type
            )
            db_edges.append(db_edge)
            
    if db_edges:
        db.add_all(db_edges)
        
    if db_nodes or db_edges:
        await db.commit()
        
    # Broadcast WS update to board
    await manager.broadcast(board_id, {
        "type": "board:roadmap_imported"
    })
    
    return {"message": "success", "nodes_created": len(db_nodes), "edges_created": len(db_edges)}

# ──── EDGES ────

@router.get("/boards/{board_id}/edges", response_model=list[EdgeResponse])
async def list_edges(
    board_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_board_access(board_id, current_user, db)
    result = await db.execute(select(Edge).where(Edge.board_id == board_id, Edge.is_deleted == False))
    return [EdgeResponse.model_validate(e) for e in result.scalars().all()]


@router.post("/boards/{board_id}/edges", response_model=EdgeResponse, status_code=201)
async def create_edge(
    board_id: str,
    data: EdgeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_board_access(board_id, current_user, db)
    edge = Edge(
        board_id=board_id,
        source_id=data.source_id,
        target_id=data.target_id,
        edge_type=data.edge_type,
        label=data.label,
    )
    db.add(edge)
    
    # Auto-assign if source node is tree assigned
    source_result = await db.execute(select(Node).where(Node.id == data.source_id))
    source_node = source_result.scalar_one_or_none()
    
    target_result = await db.execute(select(Node).where(Node.id == data.target_id))
    target_node = target_result.scalar_one_or_none()
    
    if source_node and target_node and source_node.is_tree_assigned and source_node.assigned_to:
        target_node.assigned_to = source_node.assigned_to
        target_node.is_tree_assigned = True
        
        if target_node.assigned_to != current_user.id:
            notif = Notification(
                user_id=target_node.assigned_to,
                sender_id=current_user.id,
                notification_type="node_assigned",
                title="Otomatik Atama",
                message=f"{current_user.display_name} ağaca yeni bir görev eklediği için otomatik olarak atandın."
            )
            db.add(notif)
            await global_manager.send_personal_message({"type": "REFRESH_INBOX"}, target_node.assigned_to)
            
    await db.commit()
    await db.refresh(edge)
    return EdgeResponse.model_validate(edge)


@router.delete("/edges/{edge_id}", status_code=204)
async def delete_edge(
    edge_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Edge).where(Edge.id == edge_id))
    edge = result.scalar_one_or_none()
    if not edge:
        raise HTTPException(status_code=404, detail="Edge bulunamadı")

    await _check_board_access(edge.board_id, current_user, db)
    edge.is_deleted = True
    await db.commit()
