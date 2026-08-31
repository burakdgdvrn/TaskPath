from sqlalchemy import Column, String, DateTime, ForeignKey, func, Boolean
from sqlalchemy.orm import relationship
from app.models.user import generate_uuid
from app.database import Base

class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    sender_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    receiver_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True) # For 1-on-1
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True) # For group
    encrypted_content = Column(String, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=func.now())
    is_edited = Column(Boolean, default=False, nullable=False, server_default='0')
    is_deleted = Column(Boolean, default=False, nullable=False, server_default='0')
    sender_deleted = Column(Boolean, default=False, nullable=False, server_default='0')
    receiver_deleted = Column(Boolean, default=False, nullable=False, server_default='0')

    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])
    workspace = relationship("Workspace", foreign_keys=[workspace_id])
