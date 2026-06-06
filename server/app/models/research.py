import uuid
from datetime import datetime

from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ResearchQuery(Base):
    __tablename__ = "research_queries"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    topic: Mapped[str] = mapped_column(String)
    language: Mapped[str] = mapped_column(String, default="en")
    result_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # Stored JSON result
    paper_count: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    user = relationship("User", back_populates="research_queries")
