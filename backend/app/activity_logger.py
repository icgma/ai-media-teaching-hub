"""
Activity logging — records student/teacher interactions across all modules.
Logs to data/activity_log.csv with auto-rotation.
"""
import csv
import threading
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os

_DATA_ROOT = Path(os.environ.get("DATA_DIR", Path(__file__).resolve().parents[1] / "data"))
ACTIVITY_LOG = _DATA_ROOT / "activity_log.csv"

_lock = threading.Lock()

HEADERS = ["timestamp", "module", "role", "detail"]


def log_activity(module: str, role: str, detail: str = "") -> None:
    """Append an activity record. Thread-safe."""
    ACTIVITY_LOG.parent.mkdir(parents=True, exist_ok=True)
    row = [
        datetime.now(timezone(timedelta(hours=8))).isoformat(timespec="seconds"),
        module,
        role,
        detail[:200],
    ]
    with _lock:
        write_header = not ACTIVITY_LOG.exists() or ACTIVITY_LOG.stat().st_size == 0
        with open(ACTIVITY_LOG, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            if write_header:
                writer.writerow(HEADERS)
            writer.writerow(row)


def get_activity_stats() -> dict:
    """Aggregate activity counts from log. Returns stats per module."""
    if not ACTIVITY_LOG.exists():
        return {"modules": {}, "total": 0, "today_total": 0, "recent": []}

    rows: list[dict] = []
    with open(ACTIVITY_LOG, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    if not rows:
        return {"modules": {}, "total": 0, "today_total": 0, "recent": []}

    now = datetime.now(timezone(timedelta(hours=8)))
    today_str = now.strftime("%Y-%m-%d")

    modules: dict[str, int] = {}
    today_total = 0
    for r in rows:
        mod = r.get("module", "unknown")
        modules[mod] = modules.get(mod, 0) + 1
        ts = r.get("timestamp", "")
        if ts.startswith(today_str):
            today_total += 1

    recent = rows[-20:] if len(rows) >= 20 else rows
    recent.reverse()

    return {
        "modules": modules,
        "total": len(rows),
        "today_total": today_total,
        "recent": recent,
    }
