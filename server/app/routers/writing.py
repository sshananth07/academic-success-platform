import json

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.writing import WritingReview
from app.schemas.writing import WritingReviewRequest, WritingFeedbackResponse, WritingReviewResponse
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
        .limit(20)
    )
    return [WritingReviewResponse.model_validate(r) for r in result.scalars().all()]
