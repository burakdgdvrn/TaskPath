from sqlalchemy import Column, String, DateTime, ForeignKey, func, Boolean
from sqlalchemy.orm import relationship
from app.models.user import generate_uuid
from app.database import Base


class Edge(Base):
    __tablename__ = "edges"

    id = Column(String, primary_key=True, default=generate_uuid)
    board_id = Column(String, ForeignKey("boards.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(String, ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    target_id = Column(String, ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    edge_type = Column(String(30), default="depends_on")  # depends_on | blocks | relates_to | subtask_of
    label = Column(String(100), default="")
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=func.now())

    board = relationship("Board", back_populates="edges")
    source_node = relationship("Node", foreign_keys=[source_id])
    target_node = relationship("Node", foreign_keys=[target_id])
