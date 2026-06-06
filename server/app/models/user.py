import enum
from datetime import datetime

from sqlalchemy import String, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RoleEnum(str, enum.Enum):
    STUDENT = "STUDENT"
    LECTURER = "LECTURER"
    ADMIN = "ADMIN"


class LanguageEnum(str, enum.Enum):
    en = "en"
    ms = "ms"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    faculty: Mapped[str | None] = mapped_column(String, nullable=True)
    role: Mapped[RoleEnum] = mapped_column(SAEnum(RoleEnum), default=RoleEnum.STUDENT)
    language_pref: Mapped[LanguageEnum] = mapped_column(SAEnum(LanguageEnum), default=LanguageEnum.en)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    research_queries = relationship("ResearchQuery", back_populates="user", cascade="all, delete-orphan")
    writing_reviews = relationship("WritingReview", back_populates="user", cascade="all, delete-orphan")
    grant_reviews = relationship("GrantReview", back_populates="user", cascade="all, delete-orphan")
    source_lists = relationship("SourceList", back_populates="user", cascade="all, delete-orphan")
