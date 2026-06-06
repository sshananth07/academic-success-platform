from pydantic import BaseModel, Field
from datetime import datetime


class ChatMessageRequest(BaseModel):
    session_id: str | None = None
    message: str = Field(min_length=1, max_length=2000)


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    sources_used: list[str] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SessionDetailResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[ChatMessageResponse]

    model_config = {"from_attributes": True}
