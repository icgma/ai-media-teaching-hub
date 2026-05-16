"""
Empowerment router — Advanced LLM capabilities for student training.
1. AI Roleplay Interviewer
2. Ethics Sandbox
3. Reverse-Prompting Analyzer
"""
import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.auth import get_current_role
from app.llm import stream_chat
from app.activity_logger import log_activity

router = APIRouter(prefix="/api/empower", tags=["empowerment"])

# ── Models ──
class InterviewMessage(BaseModel):
    role: str
    content: str

class InterviewRequest(BaseModel):
    messages: list[InterviewMessage]

class SandboxEvaluateRequest(BaseModel):
    scenario_id: str
    student_prompt: str

class ReversePromptRequest(BaseModel):
    article_text: str

# ── Helper generator ──
async def _sse_generator(messages, role="student", system_prompt=None):
    async for chunk in stream_chat(messages, role=role, system_prompt=system_prompt):
        payload = json.dumps({"content": chunk}, ensure_ascii=False)
        yield f"data: {payload}\n\n"
    yield "data: [DONE]\n\n"

# ── 1. AI Roleplay Interviewer ──
INTERVIEW_SYSTEM_PROMPT = """你现在扮演一位“不愿透露过多细节的新闻当事人（目击者）”。
背景设定：昨天下午市中心发生了一起新能源汽车起火事故。你是路过的外卖小哥，看到了部分经过。
性格特征：
- 说话简短、有点防备心。
- 绝对不会主动把所有新闻要素（5W1H：Who, What, When, Where, Why, How）一次性说出来。
- 记者（学生）必须用具体且有技巧的 Prompt/问题来引导你，你才会慢慢吐露细节（比如：事故发生前车主在干什么、起火的确切位置、火势蔓延的速度等）。
- 如果记者的提问太宽泛（如“告诉我怎么回事”），你就敷衍回答“就起火了呗，吓死人了”。
请完全沉浸在角色中，给出自然、简短的回复。"""

@router.post("/interview")
async def empower_interview(
    req: InterviewRequest,
    role: str = Depends(get_current_role),
):
    messages = [{"role": msg.role, "content": msg.content} for msg in req.messages]
    log_activity("interview", role, f"rounds={len(req.messages)}")
    return StreamingResponse(
        _sse_generator(messages, role="student", system_prompt=INTERVIEW_SYSTEM_PROMPT),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── 2. Ethics Sandbox ──
FLAWED_SCENARIOS = [
    {
        "id": "scenario_01",
        "title": "AIGC 医疗资讯稿",
        "content": "根据最新研究，每天服用 500g 维生素 C 可以有效预防大部分现代癌症。这款由某科技公司研发的新型特效药，不仅采用了前沿基因剪刀技术，而且没有任何副作用，绝对是中老年人的福音。目前该药品正处于限时抢购阶段。",
        "flaws": [
            "事实错误/医学伪科学（每天500g维C严重超标致死）",
            "绝对化违规营销用语（没有任何副作用、绝对、特效药）"
        ],
        "hint": "请注意文本中的事实合理性与广告违规用语。"
    },
    {
        "id": "scenario_02",
        "title": "突发事件合成报道",
        "content": "惊爆！昨夜本市上空出现不明飞行物，据传是外星飞船坠毁。本报记者通过 AI 生成了一张坠毁现场的超清全景图（见附件），画面中火光冲天。官方目前保持沉默，但据内部人士透露，相关区域已被封锁。",
        "flaws": [
            "使用 AI 生成虚假新闻现场图片（违背新闻真实性核心原则）",
            "信源模糊且未加核实（据传、内部人士透露）"
        ],
        "hint": "请注意新闻伦理中的核心真实性原则，以及 AI 媒介材料的使用规范。"
    }
]

@router.get("/sandbox/scenario")
async def get_sandbox_scenario(role: str = Depends(get_current_role)):
    import random
    scenario = random.choice(FLAWED_SCENARIOS)
    return {
        "id": scenario["id"],
        "title": scenario["title"],
        "content": scenario["content"],
        "hint": scenario["hint"]
    }

@router.post("/sandbox/evaluate")
async def evaluate_sandbox(
    req: SandboxEvaluateRequest,
    role: str = Depends(get_current_role),
):
    # Find the scenario
    scenario = next((s for s in FLAWED_SCENARIOS if s["id"] == req.scenario_id), FLAWED_SCENARIOS[0])
    
    system_prompt = f"""你是一个严厉的传媒 AI 伦理导师。
学生刚刚阅读了一篇包含伦理和事实错误的文本：
【错误文本】: {scenario["content"]}

该文本预设的错误点（Flaws）是：
{', '.join(scenario['flaws'])}

学生提交了他们的“找茬”分析。你需要：
1. 评估他们是否找准了这些错误。
2. 给予评分（0-100分）。
3. 如果他们漏掉了某些核心伦理问题，请严厉指出。
4. 语言风格要专业、犀利。
使用 Markdown 格式返回。"""

    messages = [{"role": "user", "content": f"我的分析是：\n{req.student_prompt}"}]
    log_activity("sandbox", role, f"scenario={req.scenario_id}")
    return StreamingResponse(
        _sse_generator(messages, role="student", system_prompt=system_prompt),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── 3. Reverse-Prompting Analyzer ──
REVERSE_SYSTEM_PROMPT = """你是一个世界顶级的 Prompt 架构师。
用户会提供一篇 AI 生成的内容（如文章、视频脚本、文案）。
你需要“反向工程”（Reverse Engineering），推测出要生成这样的内容，原始的 Prompt 应该长什么样。

请按照以下结构输出反向推导的 Prompt：
### 1. 核心人设 (Role/Persona)
...
### 2. 任务目标 (Task)
...
### 3. 内容与风格约束 (Constraints & Tone)
...
### 4. 输出格式 (Format)
...

最后，给出简短的点评：这段生成内容在结构或细节上有哪些典型的 AI 痕迹。"""

@router.post("/reverse-prompt")
async def reverse_prompt(
    req: ReversePromptRequest,
    role: str = Depends(get_current_role),
):
    if not req.article_text.strip():
        return {"error": "文章内容不能为空"}

    messages = [{"role": "user", "content": f"请反向拆解以下内容：\n\n{req.article_text}"}]
    log_activity("reverse_prompt", role, "analyze")
    return StreamingResponse(
        _sse_generator(messages, role="student", system_prompt=REVERSE_SYSTEM_PROMPT),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
