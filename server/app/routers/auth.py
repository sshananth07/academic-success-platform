from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User
from app.models.research import ResearchQuery
from app.models.writing import WritingReview
from app.models.source import SourceList
from app.models.grant import GrantReview
from app.models.chat import ChatSession
from app.schemas.auth import CreateProfileRequest, UserResponse
from app.dependencies import get_current_user
from app.utils.security import decode_supabase_token

router = APIRouter()
security = HTTPBearer()


@router.post("/profile", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    req: CreateProfileRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    user_id = decode_supabase_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    existing = await db.get(User, user_id)
    if existing:
        return UserResponse.model_validate(existing)

    user = User(id=user_id, email=req.email, name=req.name, faculty=req.faculty)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)


@router.get("/dashboard-stats")
async def dashboard_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    async def count(model, user_id):
        result = await db.execute(select(func.count()).select_from(model).where(model.user_id == user_id))
        return result.scalar_one()

    research = await count(ResearchQuery, user.id)
    writing = await count(WritingReview, user.id)
    sources = await count(SourceList, user.id)
    grant = await count(GrantReview, user.id)
    chat = await count(ChatSession, user.id)

    return {
        "research": research,
        "writing": writing,
        "sources": sources,
        "grant": grant,
        "chat": chat,
    }


@router.get("/recent-activity")
async def recent_activity(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items = []

    r = await db.execute(
        select(ResearchQuery.id, ResearchQuery.topic, ResearchQuery.created_at)
        .where(ResearchQuery.user_id == user.id)
        .order_by(ResearchQuery.created_at.desc()).limit(5)
    )
    for row in r.all():
        items.append({"type": "research", "label": row.topic, "id": row.id, "created_at": row.created_at.isoformat()})

    w = await db.execute(
        select(WritingReview.id, WritingReview.draft_text, WritingReview.created_at)
        .where(WritingReview.user_id == user.id)
        .order_by(WritingReview.created_at.desc()).limit(5)
    )
    for row in w.all():
        snippet = row.draft_text[:60] + ("..." if len(row.draft_text) > 60 else "")
        items.append({"type": "writing", "label": snippet, "id": row.id, "created_at": row.created_at.isoformat()})

    s = await db.execute(
        select(SourceList.id, SourceList.created_at)
        .where(SourceList.user_id == user.id)
        .order_by(SourceList.created_at.desc()).limit(5)
    )
    for row in s.all():
        items.append({"type": "sources", "label": "Sources organised", "id": row.id, "created_at": row.created_at.isoformat()})

    g = await db.execute(
        select(GrantReview.id, GrantReview.proposal_text, GrantReview.created_at)
        .where(GrantReview.user_id == user.id)
        .order_by(GrantReview.created_at.desc()).limit(5)
    )
    for row in g.all():
        snippet = row.proposal_text[:60] + ("..." if len(row.proposal_text) > 60 else "")
        items.append({"type": "grant", "label": snippet, "id": row.id, "created_at": row.created_at.isoformat()})

    c = await db.execute(
        select(ChatSession.id, ChatSession.title, ChatSession.updated_at)
        .where(ChatSession.user_id == user.id)
        .order_by(ChatSession.updated_at.desc()).limit(5)
    )
    for row in c.all():
        items.append({"type": "chat", "label": row.title, "id": row.id, "created_at": row.updated_at.isoformat()})

    items.sort(key=lambda x: x["created_at"], reverse=True)
    return items[:10]
