from pydantic import BaseModel, Field
from datetime import datetime


class SourceOrganiseRequest(BaseModel):
    inputs: list[str] = Field(min_length=1, max_length=15)
    language: str = Field(default="en", pattern="^(en|ms)$")


class SourceListResponse(BaseModel):
    list_id: str
    references: list[dict]


class SourceListHistoryResponse(BaseModel):
    id: str
    language: str
    source_count: int
    preview: str
    created_at: datetime


class SourceListDetailResponse(BaseModel):
    id: str
    language: str
    created_at: datetime
    inputs: list[str]
    references: list[dict]
