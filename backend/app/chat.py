"""
Chat router — streaming SSE endpoints for teacher and student chat.
"""
import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.auth import get_current_role, require_teacher
from app.llm import stream_chat

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    messages: list[dict]
    system_prompt: str | None = None


async def _sse_generator(messages, role, system_prompt):
    """Wrap LLM stream as Server-Sent Events."""
    async for chunk in stream_chat(messages, role=role, system_prompt=system_prompt):
        payload = json.dumps({"content": chunk}, ensure_ascii=False)
        yield f"data: {payload}\n\n"
    yield "data: [DONE]\n\n"


@router.post("/teacher")
async def teacher_chat(
    req: ChatRequest,
    role: str = Depends(require_teacher),
):
    """Teacher-facing chat."""
    return StreamingResponse(
        _sse_generator(req.messages, role="teacher", system_prompt=req.system_prompt),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/student")
async def student_chat(
    req: ChatRequest,
    role: str = Depends(get_current_role),
):
    """Student-facing chat — uses MiniMax with 5-key round-robin."""
    return StreamingResponse(
        _sse_generator(req.messages, role="student", system_prompt=req.system_prompt),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
