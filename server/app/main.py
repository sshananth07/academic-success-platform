from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, chat, research, writing, sources, grant

app = FastAPI(
    title="AI Academic Success Platform",
    version="2.0.0",
    description="Centralised academic support platform for B40 students in Malaysian universities.",
)

# CORS must be added before routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        settings.CLIENT_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Session-Id", "X-Sources", "X-Sources-Detail", "X-Confidence"],
)

app.include_router(auth.router,     prefix="/api/auth",     tags=["Auth"])
app.include_router(chat.router,     prefix="/api/chat",     tags=["Chat"])
app.include_router(research.router, prefix="/api/research", tags=["Research"])
app.include_router(writing.router,  prefix="/api/writing",  tags=["Writing"])
app.include_router(sources.router,  prefix="/api/sources",  tags=["Sources"])
app.include_router(grant.router,    prefix="/api/grant",    tags=["Grant"])


@app.get("/api/health", tags=["Health"])
async def health():
    return {"status": "ok", "version": "2.0.0"}
