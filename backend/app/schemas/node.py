from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class NodeCreate(BaseModel):
    label: str
    description: str = ""
    node_type: str = "task"
    priority: str = "medium"
    position_x: float = 300.0
    position_y: float = 300.0
    tags: str = ""
    assigned_to: Optional[str] = None


class NodeUpdate(BaseModel):
    label: Optional[str] = None
    description: Optional[str] = None
    node_type: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    tags: Optional[str] = None
    assigned_to: Optional[str] = None
    is_deleted: Optional[bool] = None

class NodeBulkUpdate(BaseModel):
    node_ids: List[str]
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    tags: Optional[str] = None
    is_deleted: Optional[bool] = None

class NodeBulkDelete(BaseModel):
    node_ids: List[str]


class AssignTreeRequest(BaseModel):
    assignee_id: str


class NodeResponse(BaseModel):
    id: str
    board_id: str
    label: str
    node_type: str
    status: str
    priority: str
    description: str
    position_x: float
    position_y: float
    tags: str
    assigned_to: Optional[str] = None
    is_tree_assigned: bool = False
    is_deleted: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EdgeCreate(BaseModel):
    source_id: str
    target_id: str
    edge_type: str = "depends_on"
    label: str = ""


class EdgeResponse(BaseModel):
    id: str
    board_id: str
    source_id: str
    target_id: str
    edge_type: str
    label: str
    is_deleted: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class RoadmapNode(BaseModel):
    id: str
    label: str
    node_type: str = "task"
    description: str = ""
    priority: str = "medium"
    tags: str = ""
    position_x: float = 0.0
    position_y: float = 0.0

class RoadmapEdge(BaseModel):
    source_id: str
    target_id: str
    edge_type: str = "depends_on"

class RoadmapImportRequest(BaseModel):
    nodes: List[RoadmapNode]
    edges: List[RoadmapEdge]
