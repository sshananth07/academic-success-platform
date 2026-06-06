import uuid
from datetime import datetime

from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class WritingReview(Base):
    __tablename__ = "writing_reviews"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    draft_text: Mapped[str] = mapped_column(Text)
    language: Mapped[str] = mapped_column(String, default="en")
    feedback_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    clarity_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    user = relationship("User", back_populates="writing_reviews")
