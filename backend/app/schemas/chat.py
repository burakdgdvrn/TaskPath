from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

# --- Friendship Schemas ---

class FriendshipBase(BaseModel):
    receiver_id: str

class FriendshipCreate(FriendshipBase):
    pass

class FriendshipCreateUsername(BaseModel):
    username: str

class FriendshipResponse(BaseModel):
    id: str
    requester_id: str
    receiver_id: str
    status: str
    created_at: datetime
    
    # We will attach user details when returning
    friend_display_name: Optional[str] = None
    friend_email: Optional[str] = None
    friend_avatar_color: Optional[str] = None
    friend_avatar_base64: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FriendshipUpdate(BaseModel):
    status: str # 'accepted' or 'rejected'

# --- Message Schemas ---

class MessageCreate(BaseModel):
    content: str
    receiver_id: Optional[str] = None
    workspace_id: Optional[str] = None

class MessageEdit(BaseModel):
    content: str

class MessageResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: Optional[str]
    workspace_id: Optional[str]
    content: str # This will be the decrypted plain text!
    is_read: bool
    created_at: datetime
    is_edited: bool = False
    is_deleted: bool = False

    sender_display_name: Optional[str] = None
    sender_avatar_color: Optional[str] = None
    sender_avatar_base64: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
