import json
import random
from pathlib import Path

SCENARIO_BANK_PATH = Path(__file__).parent.parent / "data" / "scenario_bank.json"
_scenario_cache = None


def load_scenario_bank() -> dict:
    global _scenario_cache
    if _scenario_cache is None:
        with open(SCENARIO_BANK_PATH, "r", encoding="utf-8") as f:
            _scenario_cache = json.load(f)
    return _scenario_cache


def get_random_scenario() -> dict:
    bank = load_scenario_bank()
    all_scenarios = []
    for category in bank["categories"]:
        for scenario in category["scenarios"]:
            all_scenarios.append({
                **scenario,
                "category": category["name"],
            })
    return random.choice(all_scenarios)


def get_all_scenarios() -> list[dict]:
    bank = load_scenario_bank()
    result = []
    for category in bank["categories"]:
        result.append({
            "category_id": category["id"],
            "category_name": category["name"],
            "scenarios": category["scenarios"],
        })
    return result
