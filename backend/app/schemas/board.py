from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class BoardCreate(BaseModel):
    workspace_id: str
    project_id: Optional[str] = None
    name: str
    description: Optional[str] = ""


class BoardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    project_id: Optional[str] = None


class BoardResponse(BaseModel):
    id: str
    workspace_id: str
    project_id: Optional[str] = None
    name: str
    description: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
