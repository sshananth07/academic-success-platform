from jose import jwt, JWTError
from app.config import settings


def decode_supabase_token(token: str) -> str | None:
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload.get("sub")
    except JWTError:
        return None
