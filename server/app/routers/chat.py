import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage
from app.schemas.chat import ChatMessageRequest, SessionResponse, SessionDetailResponse, ChatMessageResponse
from app.services.ai_service import AIService
from app.services.rag_service import retrieve_relevant_chunks, format_chunks_for_prompt
from app.services.language_service import detect_language
from app.services.guardrails import check_integrity_response
from app.prompts.integrity_advisor import build_prompt

router = APIRouter()


@router.post("/message")
async def send_message(
    req: ChatMessageRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get or create session
    session = None
    if req.session_id:
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == req.session_id, ChatSession.user_id == user.id
            )
        )
        session = result.scalar_one_or_none()

    if not session:
        session = ChatSession(
            user_id=user.id,
            title=req.message[:60] + ("..." if len(req.message) > 60 else ""),
        )
        db.add(session)
        await db.flush()

    # Load existing messages for history
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at)
    )
    existing_messages = result.scalars().all()
    history = [{"role": m.role, "content": m.content} for m in existing_messages]

    # Retrieve RAG chunks
    chunks = await retrieve_relevant_chunks(req.message, db)
    chunk_text = format_chunks_for_prompt(chunks)
    system_prompt = build_prompt(chunk_text)

    detected_lang = detect_language(req.message)

    # Save user message
    user_msg = ChatMessage(session_id=session.id, role="user", content=req.message)
    db.add(user_msg)

    # Update session timestamp
    session.updated_at = datetime.utcnow()
    await db.commit()

    doc_names = list({c["document"] for c in chunks})

    # Confidence: average similarity of retrieved chunks, bucketed to High/Medium/Low
    if chunks:
        avg_sim = sum(c["similarity"] for c in chunks) / len(chunks)
        confidence = "High" if avg_sim >= 0.80 else "Medium" if avg_sim >= 0.70 else "Low"
    else:
        confidence = "Low"

    # Source detail: unique docs with their best similarity score
    seen: dict[str, float] = {}
    for c in chunks:
        if c["document"] not in seen or c["similarity"] > seen[c["document"]]:
            seen[c["document"]] = c["similarity"]
    sources_detail = [{"document": doc, "similarity": round(sim, 2)} for doc, sim in seen.items()]

    async def event_generator():
        full_response = []
        try:
            async for chunk in AIService.generate_chat_stream(system_prompt, history, req.message):
                full_response.append(chunk)
                yield f"data: {json.dumps({'content': chunk})}\n\n"

            assembled = "".join(full_response)
            validated = check_integrity_response(assembled, req.message, chunks, detected_lang)

            # If guardrail modified response, send correction
            if validated != assembled:
                yield f"data: {json.dumps({'content': '', 'corrected': validated})}\n\n"
                assembled = validated

            # Persist assistant message using a new session to avoid generator context issues
            from app.database import async_session as make_session
            async with make_session() as new_db:
                assistant_msg = ChatMessage(
                    session_id=session.id,
                    role="assistant",
                    content=assembled,
                    sources_used=json.dumps(doc_names) if doc_names else None,
                )
                new_db.add(assistant_msg)
                await new_db.commit()

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Session-Id": session.id,
            "X-Sources": json.dumps(doc_names),
            "X-Sources-Detail": json.dumps(sources_detail),
            "X-Confidence": confidence,
        },
    )


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == user.id)
        .order_by(ChatSession.updated_at.desc())
    )
    return [SessionResponse.model_validate(s) for s in result.scalars().all()]


@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
async def get_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id, ChatSession.user_id == user.id
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    msg_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at)
    )
    messages = msg_result.scalars().all()
    session_data = SessionDetailResponse.model_validate(session)
    session_data.messages = [ChatMessageResponse.model_validate(m) for m in messages]
    return session_data
