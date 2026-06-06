from pydantic import BaseModel, Field
from datetime import datetime


class GrantCheckRequest(BaseModel):
    proposal_text: str = Field(min_length=50, max_length=15000)
    language: str = Field(default="en", pattern="^(en|ms)$")


class GrantReportResponse(BaseModel):
    review_id: str
    report: dict


class GrantReviewResponse(BaseModel):
    id: str
    language: str
    overall_score: int | None
    created_at: datetime

    model_config = {"from_attributes": True}
