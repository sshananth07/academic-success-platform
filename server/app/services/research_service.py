import hashlib
import json
from difflib import SequenceMatcher
from typing import Optional

import httpx
import redis.asyncio as aioredis

from app.config import settings

REDIS_TTL = 86400  # 24 hours

# CrossRef type-code → human label mapping
_CROSSREF_TYPE_MAP = {
    "journal-article": "journal",
    "proceedings-article": "conference",
    "book-chapter": "journal",
    "posted-content": "conference",
    "report": "journal",
}


def _cache_key(topic: str, filters_json: str) -> str:
    raw = f"{topic.lower()}::{filters_json}"
    return f"research:{hashlib.md5(raw.encode()).hexdigest()}"


def _titles_similar(a: str, b: str) -> bool:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio() > 0.85


async def fetch_papers(
    topic: str,
    year_from: int = 2020,
    year_to: int = 2025,
    sources: Optional[list[str]] = None,
    types: Optional[list[str]] = None,
) -> list[dict]:
    if sources is None:
        sources = ["semantic_scholar", "crossref"]
    if types is None:
        types = ["journal", "conference"]

    filters_json = json.dumps({"year_from": year_from, "year_to": year_to, "sources": sorted(sources), "types": sorted(types)})
    cache_key = _cache_key(topic, filters_json)
    redis = None
    try:
        redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        cached = await redis.get(cache_key)
        if cached:
            await redis.aclose()
            return json.loads(cached)
    except Exception:
        redis = None

    papers: list[dict] = []

    async with httpx.AsyncClient(timeout=15.0) as client:
        # Semantic Scholar
        if "semantic_scholar" in sources:
            try:
                params = {
                    "query": topic,
                    "limit": 20,
                    "fields": "title,abstract,year,authors,citationCount,url,isOpenAccess,publicationTypes",
                }
                if year_from or year_to:
                    params["year"] = f"{year_from}-{year_to}"

                ss_resp = await client.get(
                    "https://api.semanticscholar.org/graph/v1/paper/search",
                    params=params,
                )
                if ss_resp.status_code == 200:
                    data = ss_resp.json()
                    for p in data.get("data", []):
                        pub_types = [t.lower() for t in (p.get("publicationTypes") or [])]
                        paper_type = "conference" if any("conference" in t for t in pub_types) else "journal"
                        if paper_type not in types:
                            continue
                        papers.append({
                            "title": p.get("title", ""),
                            "abstract": p.get("abstract", ""),
                            "year": p.get("year"),
                            "authors": ", ".join(a.get("name", "") for a in p.get("authors", [])[:3]),
                            "citationCount": p.get("citationCount", 0),
                            "url": p.get("url", ""),
                            "isOpenAccess": p.get("isOpenAccess", False),
                            "source": "Semantic Scholar",
                            "type": paper_type,
                        })
            except Exception:
                pass

        # CrossRef
        if "crossref" in sources:
            try:
                cr_type_filter = []
                if "journal" in types:
                    cr_type_filter.append("type:journal-article")
                if "conference" in types:
                    cr_type_filter.append("type:proceedings-article")

                filter_parts = [f"from-pub-date:{year_from}", f"until-pub-date:{year_to}"]
                if cr_type_filter:
                    filter_parts.extend(cr_type_filter)

                cr_resp = await client.get(
                    "https://api.crossref.org/works",
                    params={
                        "query": topic,
                        "rows": 10,
                        "filter": ",".join(filter_parts),
                    },
                    headers={"User-Agent": "AcademicSuccessPlatform/1.0 (mailto:admin@example.com)"},
                )
                if cr_resp.status_code == 200:
                    data = cr_resp.json()
                    for item in data.get("message", {}).get("items", []):
                        title = " ".join(item.get("title", [""]))
                        if not title:
                            continue
                        authors = ", ".join(
                            f"{a.get('given', '')} {a.get('family', '')}".strip()
                            for a in item.get("author", [])[:3]
                        )
                        raw_type = item.get("type", "journal-article")
                        paper_type = _CROSSREF_TYPE_MAP.get(raw_type, "journal")
                        papers.append({
                            "title": title,
                            "abstract": item.get("abstract", ""),
                            "year": (item.get("published", {}).get("date-parts", [[None]])[0][0]),
                            "authors": authors,
                            "citationCount": item.get("is-referenced-by-count", 0),
                            "url": item.get("URL", ""),
                            "isOpenAccess": False,
                            "source": "CrossRef",
                            "type": paper_type,
                        })
            except Exception:
                pass

    # Deduplicate by title similarity
    unique: list[dict] = []
    for paper in papers:
        if not any(_titles_similar(paper["title"], u["title"]) for u in unique):
            unique.append(paper)

    if redis is not None:
        try:
            await redis.set(cache_key, json.dumps(unique), ex=REDIS_TTL)
        except Exception:
            pass
        finally:
            await redis.aclose()

    return unique
