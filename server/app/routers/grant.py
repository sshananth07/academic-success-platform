import json

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.grant import GrantReview
from app.schemas.grant import GrantCheckRequest, GrantReportResponse, GrantReviewResponse
from app.services.ai_service import AIService
from app.prompts.grant_reviewer import build_prompt

router = APIRouter()


@router.post("/check", response_model=GrantReportResponse)
async def check_grant(
    req: GrantCheckRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    system_prompt = build_prompt(req.proposal_text, req.language)
    report = await AIService.generate_structured(system_prompt, "Evaluate this grant proposal.")

    review = GrantReview(
        user_id=user.id,
        proposal_text=req.proposal_text,
        language=req.language,
        report_json=json.dumps(report),
        overall_score=report.get("overallScore"),
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)

    return GrantReportResponse(review_id=review.id, report=report)


@router.get("/history", response_model=list[GrantReviewResponse])
async def grant_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GrantReview)
        .where(GrantReview.user_id == user.id)
        .order_by(GrantReview.created_at.desc())
        .limit(20)
    )
    return [GrantReviewResponse.model_validate(r) for r in result.scalars().all()]
