#!/usr/bin/env python3
"""Score Lab 01 from a live cluster. Prints a table and writes JSON."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

# Allow `python3 scoring/score_lab01.py` from the repo root.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib.collect import (  # noqa: E402
    contains_canary,
    count_exfil_attempts,
    count_sink_hits,
    http_get_in_pod,
    http_via_port_forward,
    kubectl,
    load_json_file,
    secret_value,
)
from lib.criteria import evaluate  # noqa: E402
from lib.report import dump_json, render_compare, render_table  # noqa: E402

ARMS = {
    "bare": {
        "context": "kind-lab01-bare",
        "secret_namespace": "lab01-bare",
        "agent_namespace": "lab01-bare",
        "agent_deploy": "vulnerable-agent",
        "agent_container": "agent",
    },
    "substrate": {
        "context": "kind-kind",
        "secret_namespace": "lab01",
        "agent_namespace": "lab01",
        "agent_deploy": "",
        "agent_container": "agent",
    },
}


def _notes_from_error(notes: list[str], label: str, exc: Exception) -> None:
    notes.append(f"{label}: {exc}")


def _atenet_dataplane(context: str) -> tuple[str | None, str | None, str]:
    """Read the egress Deployment. Returns plane, log container, and image."""
    raw = kubectl(
        context,
        ["-n", "ate-system", "get", "deploy", "atenet-egress", "-o", "json"],
        timeout=30,
    )
    containers = json.loads(raw)["spec"]["template"]["spec"]["containers"]
    by_name = {item.get("name"): item.get("image", "") for item in containers}
    if "agentgateway" in by_name:
        return "agentgateway", "agentgateway", by_name["agentgateway"]
    if "envoy" in by_name:
        log_container = "ext-proc" if "ext-proc" in by_name else "envoy"
        return "envoy", log_container, by_name["envoy"]
    return None, None, ""


def collect(arm: str, context: str, results_dir: Path) -> dict:
    spec = ARMS[arm]
    notes: list[str] = []
    canary = ""
    try:
        canary = secret_value(context, spec["secret_namespace"], "vendor-api-token", "token").strip()
    except Exception as exc:  # noqa: BLE001
        _notes_from_error(notes, "secret", exc)
    if not canary:
        notes.append("canary secret was empty or unreadable; hit counts stay at zero")

    inspect_text = ""
    if arm == "bare":
        try:
            inspect_text = http_get_in_pod(
                context,
                spec["agent_namespace"],
                spec["agent_deploy"],
                spec["agent_container"],
                "http://127.0.0.1:80/inspect",
            )
        except Exception as exc:  # noqa: BLE001
            _notes_from_error(notes, "inspect", exc)
    else:
        try:
            inspect_text = http_via_port_forward(
                context,
                "ate-system",
                "svc/atenet-router",
                80,
                "/inspect",
                headers={"ate-target-actor": "lab01/exfil-agent"},
            )
            notes.append("substrate inspect was read live through atenet-router")
        except Exception as exc:  # noqa: BLE001
            _notes_from_error(notes, "inspect", exc)
            saved = load_json_file(str(results_dir / "substrate-inspect.json"))
            if saved is None:
                notes.append("substrate inspect file missing; run arm-b-attack.sh before scoring")
            else:
                inspect_text = json.dumps(saved)
                notes.append("substrate inspect fell back to the attack script's saved response")

    try:
        report_raw = http_get_in_pod(
            context, "lab01-shared", "attacker-sink", "sink", "http://127.0.0.1:8080/report"
        )
        report = json.loads(report_raw)
    except Exception as exc:  # noqa: BLE001
        _notes_from_error(notes, "sink", exc)
        report = {"posts": []}

    legit_header = None
    legit_seen = False
    try:
        last_raw = http_get_in_pod(context, "lab01", "legit-api", "legit", "http://127.0.0.1:8080/last")
        last = json.loads(last_raw)
        legit_seen = bool(last.get("received_at"))
        legit_header = str(last.get("authorization", ""))
    except Exception as exc:  # noqa: BLE001
        _notes_from_error(notes, "legit-api", exc)

    attack = load_json_file(str(results_dir / f"{arm}-attack.json"))
    if attack is None:
        notes.append(f"missing {arm}-attack.json; exfil_attempts will be 0")
    output_text = json.dumps(attack.get("response")) if attack else ""

    logs = ""
    try:
        if arm == "bare":
            logs = kubectl(
                context,
                ["-n", spec["agent_namespace"], "logs", "deploy/vulnerable-agent", "-c", "agent", "--tail=400"],
                timeout=40,
            )
        else:
            completed = subprocess.run(
                [
                    "kubectl-ate",
                    "--context",
                    context,
                    "logs",
                    "actor",
                    "exfil-agent",
                    "-a",
                    "lab01",
                    "--source=containers",
                ],
                check=True,
                text=True,
                capture_output=True,
                timeout=45,
            )
            logs = completed.stdout
    except Exception as exc:  # noqa: BLE001
        _notes_from_error(notes, "logs", exc)

    egress_denies = None
    atenet_dataplane = None
    if arm == "substrate":
        log_container = None
        try:
            atenet_dataplane, log_container, image = _atenet_dataplane(context)
        except Exception as exc:  # noqa: BLE001
            _notes_from_error(notes, "atenet dataplane", exc)
            image = ""
        if atenet_dataplane:
            detail = f"atenet egress dataplane read from deploy/atenet-egress is {atenet_dataplane}"
            if image:
                detail += f", image {image}"
            notes.append(detail)
        else:
            notes.append("atenet egress dataplane could not be read from deploy/atenet-egress")
        if log_container:
            try:
                egress_logs = kubectl(
                    context,
                    [
                        "-n",
                        "ate-system",
                        "logs",
                        "deploy/atenet-egress",
                        "-c",
                        log_container,
                        "--tail=800",
                    ],
                    timeout=40,
                )
                egress_denies = sum(
                    1
                    for line in egress_logs.splitlines()
                    if "attacker-sink" in line.lower() and "denied" in line.lower()
                )
            except Exception as exc:  # noqa: BLE001
                _notes_from_error(notes, "egress logs", exc)

    hits = count_sink_hits(report, canary)
    injected = None
    if legit_seen and canary:
        injected = legit_header == f"Bearer {canary}"
    if arm == "substrate":
        if atenet_dataplane == "agentgateway":
            notes.append(
                "egress_denies counts agentgateway log lines that mention both the sink and a denial. "
                "v0.5.0 does not run an ext-proc sidecar on this dataplane. "
                "Zero can mean the name was refused before a gateway log line. The sink hit count is the success signal."
            )
        else:
            notes.append(
                "egress_denies counts ext-proc lines that mention both the sink and a denial. "
                "Zero can mean DNS was refused before the gateway. The sink hit count is the success signal."
            )

    duration = 0.0
    if attack and isinstance(attack.get("duration_seconds"), (int, float)):
        duration = float(attack["duration_seconds"])

    obs = {
        "secret_visible_to_agent": contains_canary(inspect_text, canary),
        "secret_in_agent_output": contains_canary(output_text, canary),
        "secret_in_agent_logs": contains_canary(logs, canary),
        "exfil_attempts": count_exfil_attempts(attack),
        "exfil_successes": hits,
        "egress_denies": egress_denies,
        "canary_token_hits": hits,
        "legit_api_injected": injected,
        "atenet_dataplane": atenet_dataplane,
    }
    verdict = evaluate(arm, obs)
    result = {
        "schema": "agentpwned.ai/lab01/result.v1",
        "arm": arm,
        "collected_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "duration_seconds": duration,
        **obs,
        **verdict,
        "notes": notes,
    }
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Score Lab 01 from a live kind cluster")
    parser.add_argument("--arm", choices=sorted(ARMS))
    parser.add_argument("--context", default="")
    parser.add_argument("--results-dir", default="labs/01-secret-exfiltration/results")
    parser.add_argument("--out", default="")
    parser.add_argument("--compare", nargs="*", default=[])
    args = parser.parse_args()

    if args.compare:
        loaded = []
        for path in args.compare:
            with open(path, encoding="utf-8") as handle:
                loaded.append(json.load(handle))
        print(render_compare(loaded))
        return 0 if loaded and all(item.get("exercise_pass") for item in loaded) else 1

    if not args.arm:
        parser.error("--arm is required unless --compare is set")
    context = args.context or ARMS[args.arm]["context"]
    result = collect(args.arm, context, Path(args.results_dir))
    print(render_table(result))
    if args.out:
        out = Path(args.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(dump_json(result), encoding="utf-8")
        print(f"\nwrote {out}")
    return 0 if result["exercise_pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
