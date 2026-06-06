from pydantic import BaseModel, Field
from datetime import datetime


class WritingReviewRequest(BaseModel):
    text: str = Field(min_length=10, max_length=5000)
    language: str = Field(default="en", pattern="^(en|ms)$")


class WritingFeedbackResponse(BaseModel):
    review_id: str
    feedback: dict


class WritingReviewResponse(BaseModel):
    id: str
    language: str
    clarity_score: int | None
    created_at: datetime
    preview: str = ""

    model_config = {"from_attributes": True}


class WritingReviewDetailResponse(BaseModel):
    id: str
    language: str
    clarity_score: int | None
    created_at: datetime
    draft_text: str
    feedback: dict
