"""
Prompt Coach router — CRISPE evaluation, improvement, and practice scenario endpoints.
"""
import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.auth import get_current_role, require_teacher
from app.llm import stream_chat
from app.crispe_evaluator import get_evaluation_messages, get_improvement_messages
from app.scenarios import get_random_scenario, get_all_scenarios
from app.activity_logger import log_activity

router = APIRouter(prefix="/api/prompt", tags=["prompt-coach"])


class PromptEvaluateRequest(BaseModel):
    prompt: str


class PromptImproveRequest(BaseModel):
    original_prompt: str
    evaluation_json: str


async def _sse_generator(messages, role="student"):
    async for chunk in stream_chat(messages, role=role, system_prompt=None):
        payload = json.dumps({"content": chunk}, ensure_ascii=False)
        yield f"data: {payload}\n\n"
    yield "data: [DONE]\n\n"


@router.post("/evaluate")
async def evaluate_prompt(
    req: PromptEvaluateRequest,
    role: str = Depends(get_current_role),
):
    if not req.prompt.strip():
        return {"error": "提示词不能为空"}

    messages = get_evaluation_messages(req.prompt)
    log_activity("prompt_evaluate", role, f"len={len(req.prompt)}")
    return StreamingResponse(
        _sse_generator(messages, role="student"),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/improve")
async def improve_prompt(
    req: PromptImproveRequest,
    role: str = Depends(get_current_role),
):
    messages = get_improvement_messages(req.original_prompt, req.evaluation_json)
    log_activity("prompt_improve", role, "improve")
    return StreamingResponse(
        _sse_generator(messages, role="student"),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/practice")
async def get_practice():
    return get_random_scenario()


@router.get("/scenarios")
async def list_all_scenarios(role: str = Depends(require_teacher)):
    return {"categories": get_all_scenarios()}
