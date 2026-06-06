from pydantic import BaseModel, EmailStr
from app.models.user import RoleEnum, LanguageEnum
from datetime import datetime


class CreateProfileRequest(BaseModel):
    email: EmailStr
    name: str
    faculty: str | None = None


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    faculty: str | None
    role: RoleEnum
    language_pref: LanguageEnum
    created_at: datetime

    model_config = {"from_attributes": True}
