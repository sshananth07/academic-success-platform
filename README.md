# AI Academic Success Platform

A full-stack web platform supporting B40 students in Malaysian universities with AI-powered research discovery, academic integrity guidance, writing feedback, source organisation, and grant proposal evaluation.

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker Desktop (for PostgreSQL + Redis)

### 1. Start Database & Redis

```bash
docker-compose up -d
```

This starts:
- PostgreSQL 16 with pgvector at port 5432
- Redis 7 at port 6379

### 2. Backend Setup

```bash
cd server

# Copy and edit the environment file
cp .env.example .env
# Edit .env — add your GEMINI_API_KEY and set a strong JWT_SECRET

# Create virtual environment
python -m venv venv

# Activate venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Seed the 4 policy documents into the vector store (run once)
python -m scripts.seed_policies

# Start the API server
uvicorn app.main:app --reload --port 3001
```

Backend runs at: http://localhost:3001
API docs at: http://localhost:3001/docs

### 3. Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: http://localhost:5173

## Environment Variables

Edit `server/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/academic_platform
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your_key_from_google_ai_studio
JWT_SECRET=generate_a_long_random_string_here
```

Get a free Gemini API key at: https://aistudio.google.com/app/apikey

## Architecture

```
Client (React/Vite) ←→ FastAPI Backend ←→ PostgreSQL (pgvector) + Redis
                              ↕
                    Google Gemini 2.0 Flash
                    Semantic Scholar API
                    CrossRef API
```

## Features

| Module | Description |
|--------|-------------|
| **Integrity Advisor** | RAG-powered chatbot grounded in 4 policy documents |
| **Research Discovery** | Literature synthesis from Semantic Scholar + CrossRef |
| **Writing Support** | Structured feedback on academic drafts |
| **Source Organiser** | APA 7th Edition citation formatter |
| **Grant Checker** | FRGS proposal evaluator |

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + react-i18next
- **Backend**: FastAPI + SQLAlchemy 2.0 (async) + Alembic
- **Database**: PostgreSQL 16 + pgvector (768-dim embeddings)
- **Cache**: Redis 7
- **AI**: Google Gemini 2.0 Flash + text-embedding-004
- **Auth**: JWT (python-jose) + bcrypt (passlib)
