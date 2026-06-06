import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PolicyChunk(Base):
    __tablename__ = "policy_chunks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_name: Mapped[str] = mapped_column(String)
    chunk_text: Mapped[str] = mapped_column(Text)
    embedding = mapped_column(Vector(768))
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
