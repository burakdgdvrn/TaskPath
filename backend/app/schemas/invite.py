from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.user import UserResponse
from app.schemas.workspace import WorkspaceBasicResponse


class InviteCreateRequest(BaseModel):
    username: str


class InviteResponse(BaseModel):
    id: str
    workspace_id: str
    sender_id: str
    receiver_id: str
    status: str
    created_at: datetime
    
    workspace: WorkspaceBasicResponse
    sender: UserResponse
    receiver: UserResponse

    class Config:
        from_attributes = True
