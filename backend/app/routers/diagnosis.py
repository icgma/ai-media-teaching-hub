"""
Diagnosis router — teacher-facing learning diagnosis endpoints.
Analyzes student performance gaps and suggests pedagogical interventions.
"""
import os
import json
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.auth import require_teacher
from app.llm import stream_chat

router = APIRouter(prefix="/api/diagnosis", tags=["diagnosis"])

DATA_DIR = Path(os.environ.get("DATA_DIR", Path(__file__).resolve().parents[2] / "data"))
GRADES_DIR = DATA_DIR / "grades"


class DiagnosisRequest(BaseModel):
    hw: str


def _load_grades(hw: str) -> pd.DataFrame:
    path = GRADES_DIR / f"{hw}.csv"
    if not path.exists():
        return pd.DataFrame()
    return pd.read_csv(path)


# ── Dimension configs per assignment ──
HW_DIMS = {
    "HW_Final": {
        "dim_innovation": "创新性 (Innovation)",
        "dim_feasibility": "可行性 (Feasibility)",
        "dim_completeness": "完整性 (Completeness)",
        "dim_presentation": "展示效果 (Presentation)",
        "dim_teamwork": "团队协作 (Teamwork)",
    },
}

# HW1/HW2/HW3 are single-score assignments
SINGLE_SCORE_HWS = {"HW1", "HW2", "HW3"}

HW_DESCRIPTIONS = {
    "HW1": "第一次作业（AI 工具探索与提示词设计）",
    "HW2": "第二次作业（AI 辅助新闻写作）",
    "HW3": "第三次作业（AI 伦理案例分析）",
    "HW_Final": "期末项目（综合 AI 传媒作品）",
}


async def _diagnosis_generator(hw: str):
    df = _load_grades(hw)
    if df.empty:
        payload = json.dumps({"content": f"未找到 {hw} 的成绩数据。"}, ensure_ascii=False)
        yield f"data: {payload}\n\n"
        yield "data: [DONE]\n\n"
        return

    total_count = len(df)
    q25_threshold = df["total_score"].quantile(0.25)
    bottom_df = df[df["total_score"] <= q25_threshold]
    count_bottom = len(bottom_df)

    hw_desc = HW_DESCRIPTIONS.get(hw, hw)

    if hw in SINGLE_SCORE_HWS:
        # Single-score homework — analyze score distribution
        class_avg = df["total_score"].mean()
        bottom_avg = bottom_df["total_score"].mean() if not bottom_df.empty else 0
        class_std = df["total_score"].std()
        class_median = df["total_score"].median()
        score_min = df["total_score"].min()
        score_max = df["total_score"].max()
        zero_count = len(df[df["total_score"] == 0])

        system_prompt = (
            "你是一位资深的教育诊断专家。请基于以下提供的作业成绩数据，为教师提供深入的教学诊断建议。\n\n"
            f"本次分析作业：{hw_desc}\n"
            f"全班人数：{total_count} 名\n"
            f"重点分析对象：得分处于全班后 25% 的学生（共 {count_bottom} 名）。\n\n"
            "### 成绩分布统计：\n"
            f"- **全班平均分**: {class_avg:.1f}\n"
            f"- **中位数**: {class_median:.1f}\n"
            f"- **标准差**: {class_std:.1f}\n"
            f"- **最低分**: {score_min} / **最高分**: {score_max}\n"
            f"- **零分（未提交）人数**: {zero_count}\n"
            f"- **后 25% 平均分**: {bottom_avg:.1f}（与全班均值差距 {class_avg - bottom_avg:.1f} 分）\n\n"
            "### 后 25% 学生成绩明细（total_score）：\n"
            f"{bottom_df['total_score'].tolist()}\n\n"
            "请按以下四个固定章节输出诊断报告（使用标准 Markdown 格式）：\n"
            "1. **整体问题概述**: 总结该作业的整体完成情况、得分分布特征、异常值（如零分）。\n"
            "2. **低分群体分析**: 深入分析后 25% 学生可能遇到的困难（如理解偏差、工具使用不当、未按时提交等）。\n"
            "3. **与课程知识点关联**: 结合本次作业的考查目标，指出具体的知识或技能断层。\n"
            "4. **教学策略建议**: 为教师提供具体的补救教学策略（如：专项辅导、二次提交机制、同伴互助等）。"
        )
    else:
        # Multi-dimensional homework (HW_Final)
        dims = HW_DIMS.get(hw, {})
        overall_avg = {col: df[col].mean() for col in dims}
        bottom_avg = {col: (bottom_df[col].mean() if not bottom_df.empty else 0) for col in dims}

        dim_report = "\n".join([
            f"- **{label}**: 后 25% 平均 {bottom_avg.get(col, 0):.1f} / 全班平均 {overall_avg.get(col, 0):.1f}（差距 {overall_avg.get(col, 0) - bottom_avg.get(col, 0):.1f}）"
            for col, label in dims.items()
        ])

        system_prompt = (
            "你是一位资深的教育诊断专家。请基于以下提供的期末项目成绩数据，为教师提供深入的教学诊断建议。\n\n"
            f"本次分析：{hw_desc}\n"
            f"全班人数：{total_count} 名\n"
            f"重点分析对象：综合得分处于全班后 25% 的学生（共 {count_bottom} 名）。\n\n"
            "### 维度表现对比 (后 25% vs 全班平均)：\n"
            f"{dim_report}\n\n"
            "请按以下四个固定章节输出诊断报告（使用标准 Markdown 格式）：\n"
            "1. **整体问题概述**: 总结该群体在期末项目中的核心能力落差及表现共性。\n"
            "2. **各维度问题分析**: 深入解析五个评分维度的具体失分原因或技术瓶颈。\n"
            "3. **薄弱知识点关联**: 结合课程体系，指出具体的知识断层（如创新思维不足、技术实现受限等）。\n"
            "4. **教学策略建议**: 为教师提供具体的补救教学（如：专项工作坊、案例重构）或分层教学建议。"
        )

    async for chunk in stream_chat([], role="teacher", system_prompt=system_prompt):
        payload = json.dumps({"content": chunk}, ensure_ascii=False)
        yield f"data: {payload}\n\n"

    yield "data: [DONE]\n\n"


@router.post("/analyze")
async def analyze_diagnosis(
    req: DiagnosisRequest,
    _role: str = Depends(require_teacher),
):
    return StreamingResponse(
        _diagnosis_generator(req.hw),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/weak-points")
async def get_weak_points(_role: str = Depends(require_teacher)):
    """
    Returns a list of weak point entries across all assignments.
    For single-score HWs: reports the gap between class avg and bottom-25% avg.
    For multi-dim HWs: reports per-dimension gaps.
    """
    all_hws = ["HW1", "HW2", "HW3", "HW_Final"]
    weak_points = []

    for hw in all_hws:
        df = _load_grades(hw)
        if df.empty:
            continue

        q25 = df["total_score"].quantile(0.25)
        bottom_df = df[df["total_score"] <= q25]

        if hw in SINGLE_SCORE_HWS:
            # Single-score: report overall gap
            class_avg = df["total_score"].mean()
            bottom_avg = bottom_df["total_score"].mean() if not bottom_df.empty else 0
            gap = class_avg - bottom_avg
            zero_count = len(df[df["total_score"] == 0])

            weak_points.append({
                "hw_id": hw,
                "dimension": HW_DESCRIPTIONS.get(hw, hw),
                "avg_score": round(bottom_avg, 1),
                "max_score": 100,
                "gap": round(gap, 1),
                "count": len(bottom_df),
                "zero_count": zero_count,
            })
        else:
            # Multi-dim
            dims = HW_DIMS.get(hw, {})
            for dim_col, dim_label in dims.items():
                if dim_col not in df.columns:
                    continue
                class_avg = df[dim_col].mean()
                bottom_avg = bottom_df[dim_col].mean() if not bottom_df.empty else 0
                gap = class_avg - bottom_avg
                weak_points.append({
                    "hw_id": hw,
                    "dimension": dim_label,
                    "avg_score": round(bottom_avg, 1),
                    "max_score": 100,
                    "gap": round(gap, 1),
                    "count": len(bottom_df),
                    "zero_count": 0,
                })

    if not weak_points:
        return {"summary": "当前暂无作业成绩数据。", "weak_points": []}

    weak_points.sort(key=lambda x: x["gap"], reverse=True)
    worst = weak_points[0]
    summary = (
        f"综合 HW1-HW3 及期末项目的学习轨迹来看，"
        f"**{worst['hw_id']}** 的 **{worst['dimension']}** 维度差距最大"
        f"（低分群与班级均值差距 {worst['gap']:.1f} 分）。"
        "建议针对该环节加强专项辅导。"
    )

    return {
        "summary": summary,
        "weak_points": weak_points[:10],
    }
