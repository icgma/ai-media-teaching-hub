"""
Dashboard router — teacher-facing analytics endpoints.
Returns pre-aggregated stats from grade CSVs and heatmap data.
"""
import os
from pathlib import Path

import pandas as pd
import numpy as np
from fastapi import APIRouter, Depends

from app.auth import require_teacher
from app.activity_logger import get_activity_stats

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

DATA_DIR = Path(os.environ.get("DATA_DIR", Path(__file__).resolve().parents[2] / "data"))
GRADES_DIR = DATA_DIR / "grades"
QUERY_LOG = DATA_DIR / "query_log.csv"

SCORE_BINS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
BIN_LABELS = ["0-10", "10-20", "20-30", "30-40", "40-50", "50-60", "60-70", "70-80", "80-90", "90-100"]


def _load_grades(hw: str) -> pd.DataFrame:
    path = GRADES_DIR / f"{hw}.csv"
    if not path.exists():
        return pd.DataFrame()
    return pd.read_csv(path)


def _histogram(series: pd.Series) -> list[dict]:
    counts, _ = np.histogram(series, bins=SCORE_BINS)
    return [{"bin": label, "count": int(c)} for label, c in zip(BIN_LABELS, counts)]


def _boxplot_stats(series: pd.Series) -> dict:
    return {
        "min": float(series.min()),
        "q1": float(series.quantile(0.25)),
        "median": float(series.median()),
        "q3": float(series.quantile(0.75)),
        "max": float(series.max()),
    }


def _avg_by_dimension(df: pd.DataFrame) -> dict:
    dims = ["dim_prompting", "dim_newswriting", "dim_ethics"]
    return {d.replace("dim_", ""): round(float(df[d].mean()), 1) for d in dims if d in df.columns}


@router.get("/scores")
async def get_scores(_role: str = Depends(require_teacher)):
    result = {}
    for hw in ["HW1", "HW2", "HW3"]:
        df = _load_grades(hw)
        if df.empty:
            result[hw] = None
            continue
        result[hw] = {
            "histogram": _histogram(df["total_score"]),
            "boxplot": _boxplot_stats(df["total_score"]),
            "avg_by_dimension": _avg_by_dimension(df),
        }
    return result


@router.get("/heatmap")
async def get_heatmap(_role: str = Depends(require_teacher)):
    if not QUERY_LOG.exists():
        return {"topics": [], "max_count": 0}

    df = pd.read_csv(QUERY_LOG)
    topics = [
        {
            "topic_id": row["topic_id"],
            "topic_label": row["topic_label"],
            "query_count": int(row["query_count"]),
        }
        for _, row in df.iterrows()
    ]
    max_count = max(t["query_count"] for t in topics) if topics else 0
    return {"topics": topics, "max_count": max_count}


@router.get("/activity-stats")
async def get_activity(_role: str = Depends(require_teacher)):
    return get_activity_stats()
