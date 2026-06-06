import json

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.research import ResearchQuery
from app.schemas.research import ResearchRequest, ResearchResultResponse, ResearchQueryResponse
from app.services.ai_service import AIService
from app.services.research_service import fetch_papers
from app.services.guardrails import validate_research_sources
from app.prompts.research_synthesiser import build_prompt

router = APIRouter()


@router.post("/discover", response_model=ResearchResultResponse)
async def discover_research(
    req: ResearchRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    fltr = req.filters
    papers = await fetch_papers(
        req.topic,
        year_from=fltr.year_from if fltr else 2020,
        year_to=fltr.year_to if fltr else 2025,
        sources=fltr.sources if fltr else None,
        types=fltr.types if fltr else None,
    )
    paper_metadata = json.dumps(papers[:20], indent=2)

    system_prompt = build_prompt(paper_metadata, req.language)
    synthesis = await AIService.generate_structured(system_prompt, f"Synthesise research on: {req.topic}")
    synthesis = validate_research_sources(synthesis, papers)

    query = ResearchQuery(
        user_id=user.id,
        topic=req.topic,
        language=req.language,
        result_json=json.dumps(synthesis),
        paper_count=len(papers),
    )
    db.add(query)
    await db.commit()
    await db.refresh(query)

    return ResearchResultResponse(query_id=query.id, topic=req.topic, result=synthesis)


@router.get("/history", response_model=list[ResearchQueryResponse])
async def research_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ResearchQuery)
        .where(ResearchQuery.user_id == user.id)
        .order_by(ResearchQuery.created_at.desc())
        .limit(20)
    )
    return [ResearchQueryResponse.model_validate(q) for q in result.scalars().all()]
