"""
FastAPI application entry point.
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.auth import router as auth_router
from app.chat import router as chat_router
from app.rag_router import router as rag_router
from app.routers.dashboard import router as dashboard_router
from app.routers.diagnosis import router as diagnosis_router
from app.routers.student_performance import router as student_perf_router
from app.routers.empowerment import router as empowerment_router
from app.prompt_coach import router as prompt_coach_router
from app.rag import build_vector_store

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    async def _init_rag():
        try:
            logger.info("Initializing RAG vector store in background...")
            build_vector_store(force_rebuild=False)
            logger.info("RAG vector store ready.")
        except Exception as e:
            logger.error(f"Failed to auto-initialize RAG: {e}")

    task = asyncio.create_task(asyncio.to_thread(_init_rag))
    yield
    task.cancel()

settings = get_settings()

app = FastAPI(
    title="AI Media Teaching Hub API",
    description="传媒AI教研智能中枢 — Backend API",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ──
_origins = settings.cors_origins.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=("*" not in _origins),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(rag_router)
app.include_router(dashboard_router)
app.include_router(diagnosis_router)
app.include_router(student_perf_router)
app.include_router(prompt_coach_router)
app.include_router(empowerment_router)

# ── Static files (after routers to avoid route conflicts) ──
app.mount("/static", StaticFiles(directory="static"), name="static")


# ── Health check ──
@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "service": "ai-media-teaching-hub",
        "version": "0.1.0",
    }
