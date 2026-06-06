import re


REDIRECT_MSG_EN = (
    "I'm here to help you understand the rules and improve your writing skills, "
    "but I can't write academic content for you. Try the Writing Support module "
    "for feedback on your own draft."
)

REDIRECT_MSG_MS = (
    "Saya di sini untuk membantu anda memahami peraturan dan meningkatkan kemahiran "
    "penulisan anda, tetapi saya tidak boleh menulis kandungan akademik untuk anda. "
    "Cuba modul Sokongan Penulisan untuk maklum balas tentang draf anda sendiri."
)

DISCLAIMER_EN = (
    "\n\n*Note: This guidance is general. Please verify with your faculty office.*"
)
DISCLAIMER_MS = (
    "\n\n*Nota: Panduan ini adalah umum. Sila sahkan dengan pejabat fakulti anda.*"
)

ACADEMIC_KEYWORDS = [
    "introduction", "methodology", "conclusion", "abstract", "literature review",
    "research objectives", "hypothesis", "findings", "references",
]


def _is_essay_like(text: str) -> bool:
    """Detect if a response looks like a generated academic essay."""
    word_count = len(text.split())
    if word_count < 500:
        return False
    text_lower = text.lower()
    keyword_hits = sum(1 for kw in ACADEMIC_KEYWORDS if kw in text_lower)
    return keyword_hits >= 3


def check_integrity_response(
    response_text: str, user_message: str, chunks: list[dict], language: str = "en"
) -> str:
    # Block assignment generation
    if _is_essay_like(response_text) and "?" in user_message:
        return REDIRECT_MSG_MS if language == "ms" else REDIRECT_MSG_EN

    # Add disclaimer if response makes claims not traceable to any chunk
    if chunks:
        chunk_words = set(
            " ".join(c["text"] for c in chunks).lower().split()
        )
        response_words = set(response_text.lower().split())
        overlap_ratio = len(response_words & chunk_words) / max(len(response_words), 1)
        if overlap_ratio < 0.05 and len(response_text.split()) > 80:
            disclaimer = DISCLAIMER_MS if language == "ms" else DISCLAIMER_EN
            response_text += disclaimer

    return response_text


def strip_replacement_paragraphs(feedback: dict) -> dict:
    """Remove any full replacement text from writing feedback."""
    if "grammarIssues" in feedback:
        cleaned = []
        for issue in feedback["grammarIssues"]:
            suggestion = issue.get("suggestion", "")
            # If suggestion is more than 40 words, it may be a replacement paragraph
            if len(suggestion.split()) > 40:
                issue["suggestion"] = "[See your faculty writing centre for rewrite help]"
            cleaned.append(issue)
        feedback["grammarIssues"] = cleaned
    return feedback


def validate_research_sources(synthesis: dict, raw_papers: list[dict]) -> dict:
    """Strip fabricated references from research synthesis."""
    raw_titles_lower = {p["title"].lower() for p in raw_papers}

    if "sources" in synthesis:
        validated = []
        for s in synthesis["sources"]:
            title = s.get("title", "").lower()
            if any(title in rt or rt in title for rt in raw_titles_lower):
                validated.append(s)
        synthesis["sources"] = validated

    return synthesis
