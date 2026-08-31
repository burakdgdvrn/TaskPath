from sqlalchemy import Column, String, Text, Float, DateTime, ForeignKey, func, Boolean
from sqlalchemy.orm import relationship
from app.models.user import generate_uuid
from app.database import Base


class Node(Base):
    __tablename__ = "nodes"

    id = Column(String, primary_key=True, default=generate_uuid)
    board_id = Column(String, ForeignKey("boards.id", ondelete="CASCADE"), nullable=False, index=True)
    label = Column(String(255), nullable=False)
    node_type = Column(String(20), default="task")  # task | note | milestone | wiki
    status = Column(String(20), default="todo")      # todo | in_progress | testing | done | archived
    priority = Column(String(20), default="medium")   # low | medium | high
    description = Column(Text, default="")
    position_x = Column(Float, default=300.0)
    position_y = Column(Float, default=300.0)
    tags = Column(Text, default="")  # comma-separated for SQLite compat
    assigned_to = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_tree_assigned = Column(Boolean, default=False)
    due_date = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    board = relationship("Board", back_populates="nodes")
    assignee = relationship("User", foreign_keys=[assigned_to])
