"""
Dual-LLM service layer.
- Teacher model: configurable via TEACHER_API_KEY (DeepSeek or any OpenAI-compatible API)
- Student model: MiniMax with 5-key round-robin
Both use OpenAI-compatible SDK.
"""
import itertools
import logging
from openai import AsyncOpenAI
from app.config import get_settings

logger = logging.getLogger(__name__)

# ── Round-robin key pool for MiniMax ──
_key_cycle = None


def _get_minimax_key_cycle():
    global _key_cycle
    if _key_cycle is None:
        settings = get_settings()
        keys = settings.minimax_keys
        if not keys:
            raise RuntimeError("No MiniMax API keys configured in .env")
        _key_cycle = itertools.cycle(keys)
        logger.info(f"MiniMax key pool initialized with {len(keys)} keys")
    return _key_cycle


def get_teacher_client() -> tuple[AsyncOpenAI, str]:
    """Return (client, model) for teacher-facing inference."""
    settings = get_settings()
    if settings.teacher_api_key:
        client = AsyncOpenAI(
            api_key=settings.teacher_api_key,
            base_url=settings.teacher_base_url,
        )
        return client, settings.teacher_model
    else:
        logger.info("Teacher API key not configured, falling back to MiniMax for teacher")
        return get_student_client()


def get_student_client() -> tuple[AsyncOpenAI, str]:
    """Return (client, model) for student-facing MiniMax with round-robin key."""
    settings = get_settings()
    key = next(_get_minimax_key_cycle())
    client = AsyncOpenAI(
        api_key=key,
        base_url=settings.minimax_base_url,
    )
    return client, settings.minimax_model


async def stream_chat(
    messages: list[dict],
    role: str = "student",
    system_prompt: str | None = None,
):
    """
    Async generator that yields text chunks from the LLM.
    Selects teacher or student model based on role.
    Implements retry with next key on failure for student requests.
    """
    if role == "teacher":
        client, model = get_teacher_client()
    else:
        client, model = get_student_client()

    full_messages = []
    if system_prompt:
        full_messages.append({"role": "system", "content": system_prompt})
    full_messages.extend(messages)

    max_retries = 5 if role == "student" else 1

    for attempt in range(max_retries):
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=full_messages,
                stream=True,
                temperature=0.7,
                max_tokens=2048,
            )
            async for chunk in response:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta and delta.content:
                    yield delta.content
            return  # success, exit
        except Exception as e:
            logger.warning(f"LLM attempt {attempt+1}/{max_retries} failed: {e}")
            if role == "student" and attempt < max_retries - 1:
                # Rotate to next key
                client, model = get_student_client()
                continue
            else:
                yield f"\n\n⚠️ AI 服务暂时不可用，请稍后再试。(Error: {type(e).__name__})"
                return
