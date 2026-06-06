MALAY_STOPWORDS = {
    "dan", "yang", "untuk", "dengan", "ini", "itu", "adalah", "dalam",
    "pada", "tidak", "saya", "apa", "bagaimana", "boleh", "perlu",
    "seperti", "tentang", "juga", "akan", "telah",
}


def detect_language(text: str) -> str:
    words = set(text.lower().split())
    matches = words & MALAY_STOPWORDS
    return "ms" if len(matches) >= 3 else "en"
