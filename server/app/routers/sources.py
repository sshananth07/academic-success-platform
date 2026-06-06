import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.source import SourceList
from app.schemas.source import SourceOrganiseRequest, SourceListResponse, SourceListHistoryResponse, SourceListDetailResponse
from app.services.ai_service import AIService
from app.prompts.source_organiser import build_prompt

router = APIRouter()


@router.post("/organise", response_model=SourceListResponse)
async def organise_sources(
    req: SourceOrganiseRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    source_inputs = "\n".join(f"- {s}" for s in req.inputs)
    system_prompt = build_prompt(source_inputs, req.language)
    result = await AIService.generate_structured(system_prompt, "Organise and cite these sources.")

    source_list = SourceList(
        user_id=user.id,
        inputs_json=json.dumps(req.inputs),
        language=req.language,
        references_json=json.dumps(result),
    )
    db.add(source_list)
    await db.commit()
    await db.refresh(source_list)

    return SourceListResponse(list_id=source_list.id, references=result.get("references", []))


@router.get("/history", response_model=list[SourceListHistoryResponse])
async def sources_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SourceList)
        .where(SourceList.user_id == user.id)
        .order_by(SourceList.created_at.desc())
        .limit(50)
    )
    rows = result.scalars().all()
    out = []
    for r in rows:
        try:
            inputs = json.loads(r.inputs_json) if r.inputs_json else []
        except Exception:
            inputs = []
        preview = inputs[0] if inputs else "—"
        out.append(SourceListHistoryResponse(
            id=r.id,
            language=r.language,
            source_count=len(inputs),
            preview=preview[:80],
            created_at=r.created_at,
        ))
    return out


@router.get("/{list_id}", response_model=SourceListDetailResponse)
async def get_source_list(
    list_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.execute(
        select(SourceList).where(SourceList.id == list_id, SourceList.user_id == user.id)
    )
    source_list = row.scalar_one_or_none()
    if not source_list:
        raise HTTPException(status_code=404, detail="Source list not found")

    try:
        inputs = json.loads(source_list.inputs_json) if source_list.inputs_json else []
    except Exception:
        inputs = []
    try:
        refs_raw = json.loads(source_list.references_json) if source_list.references_json else {}
        references = refs_raw.get("references", []) if isinstance(refs_raw, dict) else refs_raw
    except Exception:
        references = []

    return SourceListDetailResponse(
        id=source_list.id,
        language=source_list.language,
        created_at=source_list.created_at,
        inputs=inputs,
        references=references,
    )
