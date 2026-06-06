import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.writing import WritingReview
from app.schemas.writing import (
    WritingReviewRequest, WritingFeedbackResponse,
    WritingReviewResponse, WritingReviewDetailResponse,
)
from app.services.ai_service import AIService
from app.services.guardrails import strip_replacement_paragraphs
from app.prompts.writing_coach import build_prompt

router = APIRouter()


@router.post("/review", response_model=WritingFeedbackResponse)
async def review_writing(
    req: WritingReviewRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    system_prompt = build_prompt(req.text, req.language)
    feedback = await AIService.generate_structured(system_prompt, "Review this academic draft.")
    feedback = strip_replacement_paragraphs(feedback)

    review = WritingReview(
        user_id=user.id,
        draft_text=req.text,
        language=req.language,
        feedback_json=json.dumps(feedback),
        clarity_score=feedback.get("clarityScore"),
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)

    return WritingFeedbackResponse(review_id=review.id, feedback=feedback)


@router.get("/history", response_model=list[WritingReviewResponse])
async def writing_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WritingReview)
        .where(WritingReview.user_id == user.id)
        .order_by(WritingReview.created_at.desc())
        .limit(50)
    )
    rows = result.scalars().all()
    out = []
    for r in rows:
        preview = (r.draft_text or "")[:80].replace("\n", " ")
        out.append(WritingReviewResponse(
            id=r.id,
            language=r.language,
            clarity_score=r.clarity_score,
            created_at=r.created_at,
            preview=preview,
        ))
    return out


@router.get("/{review_id}", response_model=WritingReviewDetailResponse)
async def get_writing_review(
    review_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.execute(
        select(WritingReview).where(
            WritingReview.id == review_id,
            WritingReview.user_id == user.id,
        )
    )
    review = row.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    try:
        feedback = json.loads(review.feedback_json) if review.feedback_json else {}
    except Exception:
        feedback = {}

    return WritingReviewDetailResponse(
        id=review.id,
        language=review.language,
        clarity_score=review.clarity_score,
        created_at=review.created_at,
        draft_text=review.draft_text or "",
        feedback=feedback,
    )
