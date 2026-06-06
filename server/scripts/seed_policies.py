"""
Run once to seed policy documents into the vector store.
Usage: cd server && python -m scripts.seed_policies
"""
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.ai_service import AIService
from app.utils.chunker import chunk_text
from app.database import async_session
from sqlalchemy import text

POLICY_DIR = Path(__file__).parent.parent / "data" / "policies"


async def seed():
    print(f"Looking for policy documents in: {POLICY_DIR}")
    docs = list(POLICY_DIR.glob("*.md"))
    if not docs:
        print("ERROR: No .md files found in data/policies/")
        return

    async with async_session() as db:
        await db.execute(text("DELETE FROM policy_chunks"))
        await db.commit()
        print("Cleared existing chunks.")

        for doc_path in docs:
            content = doc_path.read_text(encoding="utf-8")
            chunks = chunk_text(content, chunk_size=500, overlap=50)
            print(f"Processing {doc_path.name}: {len(chunks)} chunks...")

            for i, chunk in enumerate(chunks):
                embedding = await AIService.embed_text(chunk)
                embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"

                await db.execute(
                    text("""
                        INSERT INTO policy_chunks (id, document_name, chunk_text, embedding, metadata)
                        VALUES (gen_random_uuid(), :doc_name, :chunk_text, CAST(:embedding AS vector), CAST(:metadata AS jsonb))
                    """),
                    {
                        "doc_name": doc_path.stem,
                        "chunk_text": chunk,
                        "embedding": embedding_str,
                        "metadata": json.dumps({"chunk_index": i, "source_file": doc_path.name}),
                    },
                )

            await db.commit()
            print(f"  Seeded {len(chunks)} chunks from {doc_path.name}")

    print("\nSeeding complete!")


if __name__ == "__main__":
    asyncio.run(seed())
