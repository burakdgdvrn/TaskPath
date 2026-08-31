from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.models.user import generate_uuid
from app.database import Base


class Board(Base):
    __tablename__ = "boards"

    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    workspace = relationship("Workspace", back_populates="boards")
    project = relationship("Project", back_populates="boards")
    nodes = relationship("Node", back_populates="board", cascade="all, delete-orphan")
    edges = relationship("Edge", back_populates="board", cascade="all, delete-orphan")
