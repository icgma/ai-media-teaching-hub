"""
Student performance router — individual + class average scores.
"""
import os
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, Query

from app.auth import get_current_role

router = APIRouter(prefix="/api/student", tags=["student"])

DATA_DIR = Path(os.environ.get("DATA_DIR", Path(__file__).resolve().parents[2] / "data"))
GRADES_DIR = DATA_DIR / "grades"

DIMS = ["dim_prompting", "dim_newswriting", "dim_ethics"]
DIM_LABELS = {"dim_prompting": "prompting", "dim_newswriting": "newswriting", "dim_ethics": "ethics"}


def _load_grades(hw: str) -> pd.DataFrame:
    path = GRADES_DIR / f"{hw}.csv"
    if not path.exists():
        return pd.DataFrame()
    return pd.read_csv(path)


@router.get("/performance")
async def get_performance(
    student_id: str = Query(..., description="Anonymous student ID, e.g. S001"),
    hw: str = Query("HW1", description="Assignment: HW1, HW2, or HW3"),
    _role: str = Depends(get_current_role),
):
    df = _load_grades(hw)
    if df.empty:
        return {"error": "Assignment data not found"}

    row = df[df["student_id"] == student_id]
    if row.empty:
        return {"error": "学号不存在，请检查后重新输入", "status": 404}

    scores = {DIM_LABELS[d]: int(row.iloc[0][d]) for d in DIMS if d in df.columns}
    class_avg = {DIM_LABELS[d]: round(float(df[d].mean()), 1) for d in DIMS if d in df.columns}

    return {
        "student_id": student_id,
        "hw": hw,
        "scores": scores,
        "class_avg": class_avg,
    }
