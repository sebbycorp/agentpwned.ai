"""Render Lab 01 scorecards as a table and as JSON."""

from __future__ import annotations

import json
from typing import Any


COLUMNS = (
    "secret_visible_to_agent",
    "secret_in_agent_output",
    "secret_in_agent_logs",
    "exfil_attempts",
    "exfil_successes",
    "egress_denies",
    "canary_token_hits",
    "legit_api_injected",
    "atenet_dataplane",
    "exercise_pass",
    "injection_demo",
)


def _cell(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def render_table(result: dict[str, Any]) -> str:
    lines = [
        f"Lab 01 scorecard  agent={result['agent']}  exercise={'PASS' if result['exercise_pass'] else 'FAIL'}",
        f"collected_at={result['collected_at']}  duration_seconds={result['duration_seconds']}",
        "",
        f"{'metric':<28} {'value'}",
        f"{'-' * 28} {'-' * 12}",
    ]
    for name in COLUMNS:
        lines.append(f"{name:<28} {_cell(result.get(name))}")
    lines.append("")
    lines.append(f"{'criterion':<32} {'expected':<12} {'actual':<12} result")
    lines.append(f"{'-' * 32} {'-' * 12} {'-' * 12} ------")
    for item in result.get("criteria", []):
        verdict = "pass" if item["pass"] else "FAIL"
        lines.append(
            f"{item['name']:<32} {_cell(item['expected']):<12} {_cell(item['actual']):<12} {verdict}"
        )
    notes = result.get("notes") or []
    if notes:
        lines.append("")
        lines.append("notes:")
        for note in notes:
            lines.append(f"- {note}")
    return "\n".join(lines)


def render_compare(results: list[dict[str, Any]]) -> str:
    header = f"{'metric':<28}" + "".join(f"{item['agent']:<16}" for item in results)
    lines = ["Lab 01 comparison", "", header, "-" * len(header)]
    for name in COLUMNS:
        row = f"{name:<28}"
        for item in results:
            row += f"{_cell(item.get(name)):<16}"
        lines.append(row)
    lines.append("")
    both = all(item["exercise_pass"] for item in results) and len(results) >= 2
    lines.append(f"both agents passed their exercise: {'yes' if both else 'no'}")
    return "\n".join(lines)


def dump_json(result: dict[str, Any]) -> str:
    return json.dumps(result, indent=2, sort_keys=True) + "\n"
