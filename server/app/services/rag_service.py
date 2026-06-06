from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.services.ai_service import AIService


async def retrieve_relevant_chunks(
    query: str, db: AsyncSession, top_k: int = 8
) -> list[dict]:
    query_embedding = await AIService.embed_text(query)
    embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"

    result = await db.execute(
        text("""
            SELECT id, document_name, chunk_text,
                   1 - (embedding <=> CAST(:embedding AS vector)) AS similarity
            FROM policy_chunks
            ORDER BY embedding <=> CAST(:embedding AS vector)
            LIMIT :top_k
        """),
        {"embedding": embedding_str, "top_k": top_k},
    )

    rows = result.fetchall()
    return [
        {
            "document": row.document_name,
            "text": row.chunk_text,
            "similarity": float(row.similarity),
        }
        for row in rows
        if float(row.similarity) > 0.65
    ]


def format_chunks_for_prompt(chunks: list[dict]) -> str:
    if not chunks:
        return "No relevant policy documents were found for this query."

    formatted = []
    for chunk in chunks:
        formatted.append(
            f"[Source: {chunk['document']} | Relevance: {chunk['similarity']:.2f}]\n{chunk['text']}"
        )
    return "\n\n---\n\n".join(formatted)
