"""
RAG router — retrieval-augmented generation endpoints for teacher and student Q&A.
"""
import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.auth import get_current_role, require_teacher
from app.llm import stream_chat
from app.rag import query_vector_store, build_vector_store
from app.activity_logger import log_activity

router = APIRouter(prefix="/api/rag", tags=["rag"])


class RAGRequest(BaseModel):
    question: str
    top_k: int = 5


class IngestResponse(BaseModel):
    status: str
    count: int


def _build_rag_context(results: list[dict]) -> str:
    """Format retrieved chunks into a context block for the LLM."""
    if not results:
        return "（未检索到相关课程资料）"

    context_parts = []
    for i, r in enumerate(results, 1):
        meta = r["metadata"]
        source = f"[{meta.get('week', '?')}] {meta.get('filename', '?')}"
        context_parts.append(f"【参考 {i}】来源: {source}\n{r['text']}")

    return "\n\n---\n\n".join(context_parts)


def _build_citations(results: list[dict]) -> list[dict]:
    """Extract citation metadata for the frontend."""
    seen = set()
    citations = []
    for r in results:
        meta = r["metadata"]
        key = f"{meta.get('week', '')}-{meta.get('filename', '')}"
        if key not in seen:
            seen.add(key)
            citations.append({
                "week": meta.get("week", ""),
                "filename": meta.get("filename", ""),
                "doc_type": meta.get("doc_type", ""),
                "relevance": round(1 - r.get("distance", 0), 3),
            })
    return citations


TEACHER_RAG_PROMPT = """你是课程的AI教研助手。
请根据以下检索到的课程资料，回答教师的问题。你可以据此生成教案、课堂讨论题、考试题目或教学建议。

要求：
1. 回答必须基于提供的课程资料内容，不得凭空捏造
2. 在回答末尾注明引用了哪些参考来源
3. 如果资料不足以完整回答，请明确指出，并提供部分可用信息
4. 语言专业、学术化，适合教研使用

以下是检索到的课程资料：
{context}"""

STUDENT_RAG_PROMPT = """你是课程的AI学习助手。
请根据以下检索到的课程资料，回答学生的问题。

要求：
1. 回答必须基于提供的课程资料，不得凭空编造
2. 语言通俗易懂，适合本科生理解
3. 在回答末尾注明参考来源
4. 如果课程资料中没有相关内容，请告知学生并建议咨询老师
5. 鼓励学生动手实践

以下是检索到的课程资料：
{context}"""


async def _rag_sse_generator(question: str, role: str, top_k: int = 5):
    """Retrieve relevant chunks, then stream LLM response as SSE."""
    results = query_vector_store(question, top_k=top_k)
    context = _build_rag_context(results)
    citations = _build_citations(results)
    log_activity("rag_query", role, question[:200])

    yield f"data: {json.dumps({'citations': citations}, ensure_ascii=False)}\n\n"

    if role == "teacher":
        system_prompt = TEACHER_RAG_PROMPT.format(context=context)
    else:
        system_prompt = STUDENT_RAG_PROMPT.format(context=context)

    messages = [{"role": "user", "content": question}]

    async for chunk in stream_chat(messages, role=role, system_prompt=system_prompt):
        payload = json.dumps({"content": chunk}, ensure_ascii=False)
        yield f"data: {payload}\n\n"

    yield "data: [DONE]\n\n"


@router.post("/teacher")
async def teacher_rag(req: RAGRequest, role: str = Depends(require_teacher)):
    """Teacher RAG — retrieves course materials and generates with teacher model."""
    return StreamingResponse(
        _rag_sse_generator(req.question, role="teacher", top_k=req.top_k),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.post("/student")
async def student_rag(req: RAGRequest, role: str = Depends(get_current_role)):
    """Student RAG — retrieves course materials and generates with MiniMax."""
    return StreamingResponse(
        _rag_sse_generator(req.question, role="student", top_k=req.top_k),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.post("/ingest", response_model=IngestResponse)
async def ingest(role: str = Depends(require_teacher)):
    """Rebuild the RAG vector store from course materials. Teacher only."""
    from app.rag import load_and_chunk_documents
    docs = load_and_chunk_documents()
    collection = build_vector_store(docs, force_rebuild=True)
    return IngestResponse(status="ok", count=collection.count())


@router.get("/status")
async def rag_status():
    """Check if the vector store is initialized."""
    try:
        results = query_vector_store("测试", top_k=1)
        return {"initialized": len(results) > 0, "sample_count": len(results)}
    except Exception:
        return {"initialized": False, "sample_count": 0}
