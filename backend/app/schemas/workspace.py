from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.user import UserResponse


class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = ""


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class WorkspaceMemberResponse(BaseModel):
    role: str
    user: UserResponse
    
    class Config:
        from_attributes = True


class WorkspaceBasicResponse(BaseModel):
    id: str
    name: str
    description: str
    owner_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    description: str
    owner_id: str
    created_at: datetime
    updated_at: datetime
    members: List[WorkspaceMemberResponse] = []

    class Config:
        from_attributes = True
