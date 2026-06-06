import uuid
from datetime import datetime

from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SourceList(Base):
    __tablename__ = "source_lists"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    inputs_json: Mapped[str] = mapped_column(Text)  # JSON array of raw inputs
    language: Mapped[str] = mapped_column(String, default="en")
    references_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON result
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    user = relationship("User", back_populates="source_lists")
