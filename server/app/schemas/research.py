from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class ResearchFilters(BaseModel):
    year_from: int = Field(default=2020, ge=1900, le=2100)
    year_to: int = Field(default=2025, ge=1900, le=2100)
    sources: list[str] = Field(default=["semantic_scholar", "crossref"])
    types: list[str] = Field(default=["journal", "conference"])


class ResearchRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=500)
    language: str = Field(default="en", pattern="^(en|ms)$")
    filters: Optional[ResearchFilters] = None


class ResearchQueryResponse(BaseModel):
    id: str
    topic: str
    language: str
    paper_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ResearchResultResponse(BaseModel):
    query_id: str
    topic: str
    result: dict
