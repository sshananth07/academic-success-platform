from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, RoleEnum, LanguageEnum
from app.utils.security import decode_supabase_token

security = HTTPBearer(auto_error=False)

DEV_BYPASS = True

_dev_user = User(
    id="dev-user",
    email="dev@student.uam.edu.my",
    name="Dev User",
    faculty="Faculty of Computer Science",
    role=RoleEnum.STUDENT,
    language_pref=LanguageEnum.en,
)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    if DEV_BYPASS:
        existing = await db.get(User, _dev_user.id)
        if not existing:
            db.add(User(
                id=_dev_user.id,
                email=_dev_user.email,
                name=_dev_user.name,
                faculty=_dev_user.faculty,
                role=_dev_user.role,
                language_pref=_dev_user.language_pref,
            ))
            await db.commit()
            existing = await db.get(User, _dev_user.id)
        return existing

    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    user_id = decode_supabase_token(credentials.credentials)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user
