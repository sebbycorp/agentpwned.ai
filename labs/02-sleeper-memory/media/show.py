#!/usr/bin/env python3
"""Print one Lab 02 scene from saved transcripts and the live clusters.

vhs tapes call this. If the cluster or the transcript is missing, exit non-zero.
Do not paste a scorecard into the tape.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import textwrap
from pathlib import Path

os.environ["PATH"] = f"{Path.home()}/.local/bin:/usr/local/go/bin:" + os.environ.get("PATH", "")

LAB = Path(__file__).resolve().parents[1]
RESULTS = LAB / "results"
WIDTH = 100


def say(text: str = "") -> None:
    print(text, flush=True)


def block(text: str) -> None:
    for line in text.splitlines() or [""]:
        wrapped = textwrap.wrap(
            line,
            width=WIDTH,
            replace_whitespace=False,
            drop_whitespace=False,
            break_long_words=True,
            break_on_hyphens=False,
        )
        say("\n".join(wrapped) if wrapped else "")


def run(args: list[str]) -> str:
    completed = subprocess.run(args, check=False, text=True, capture_output=True)
    if completed.returncode != 0:
        sys.stderr.write(completed.stderr)
        sys.exit(f"command failed ({completed.returncode}): {' '.join(args)}")
    return completed.stdout.rstrip()


def read_json(name: str) -> dict:
    path = RESULTS / name
    if not path.is_file():
        sys.exit(f"missing {path}. Run the attack script before recording.")
    return json.loads(path.read_text(encoding="utf-8"))


def read_text(name: str) -> str:
    path = RESULTS / name
    if not path.is_file():
        sys.exit(f"missing {path}. Run the attack script before recording.")
    return path.read_text(encoding="utf-8").rstrip()


def attacker_server_report(context: str) -> dict:
    raw = run(
        [
            "kubectl",
            "--context",
            context,
            "-n",
            "lab02-shared",
            "exec",
            "deploy/attacker-server",
            "--",
            "python",
            "-c",
            "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8080/report').read().decode())",
        ]
    )
    report = json.loads(raw)
    for post in report.get("posts") or []:
        body = post.get("body")
        if isinstance(body, str):
            try:
                post["body"] = json.loads(body)
            except json.JSONDecodeError:
                pass
    return report


def redact(value: object) -> object:
    """Hide canary values. The clip shows the path, not the secret."""
    if isinstance(value, str):
        import re

        return re.sub(
            r"lab02_(canary|session)_[0-9a-f]+",
            lambda match: f"lab02_{match.group(1)}_<redacted>",
            value,
        )
    if isinstance(value, list):
        return [redact(item) for item in value]
    if isinstance(value, dict):
        return {key: redact(item) for key, item in value.items()}
    return value


def posts(transcript: dict) -> list[dict]:
    return [step for step in transcript["response"]["steps"] if step.get("tool") == "http_post"]


def scene_bare_leak() -> None:
    transcript = read_json("bare-session2.json")
    say("Bare agent leak. Transcript plus the live attacker server.")
    say(
        f"results/bare-session2.json duration_seconds={transcript['duration_seconds']} "
        f"boot_id={transcript['response'].get('boot_id')}"
    )
    for step in posts(transcript):
        say(f"status={step.get('status')} error={step.get('error')} url={step.get('url')}")
        body = redact(step.get("body"))
        block(json.dumps(body, indent=2))
        body = step.get("response_body")
        if body is not None:
            say(f"response_body={body if isinstance(body, str) else json.dumps(body)}")
    say("")
    say("live GET /report on attacker-server")
    block(json.dumps(redact(attacker_server_report("kind-lab02-bare")), indent=2))


def scene_replay() -> None:
    session1 = read_json("bare-session1.json")
    session2 = read_json("bare-session2.json")
    say("What just happened. Files the bare attack wrote.")
    say(f"session1 duration_seconds={session1['duration_seconds']} boot_id={session1['response'].get('boot_id')}")
    say(f"session2 duration_seconds={session2['duration_seconds']} boot_id={session2['response'].get('boot_id')}")
    say(f"pod uid before {read_text('bare-pod-uid-before.txt')}")
    say(f"pod uid after  {read_text('bare-pod-uid-after.txt')}")
    say("")
    say("memory after restart")
    block(read_text("bare-memory-after-restart.txt"))
    say("")
    for step in posts(session2):
        if "attacker-server" not in str(step.get("url")):
            continue
        body = step.get("response_body")
        rendered = body if isinstance(body, str) else json.dumps(body)
        say(f"attacker status={step.get('status')} response_body={rendered}")
    say("egress_denies is null on this cluster. There is no gateway.")


def scene_sandboxed_block() -> None:
    transcript = read_json("sandboxed-session2.json")
    say("Sandboxed agent callback. Poison survived. agentgateway denied the host.")
    say(
        f"results/sandboxed-session2.json duration_seconds={transcript['duration_seconds']} "
        f"boot_id={transcript['response'].get('boot_id')}"
    )
    for index, step in enumerate(posts(transcript), start=1):
        say(f"attempt {index} status={step.get('status')} error={step.get('error')}")
        say(f"  url={step.get('url')}")
        if step.get("dial_ip"):
            say(f"  dial_ip={step.get('dial_ip')}")
        if step.get("response_body") is not None:
            say(f"  response_body={step.get('response_body')}")
    say("")
    say("agentgateway deny lines for the attacker server")
    logs = run(
        [
            "kubectl",
            "--context",
            "kind-lab02-sandboxed",
            "-n",
            "ate-system",
            "logs",
            "deploy/atenet-egress",
            "-c",
            "agentgateway",
            "--tail=2000",
        ]
    )
    denies = [
        line
        for line in logs.splitlines()
        if "attacker-server" in line.lower() and "actor egress policy denied destination" in line.lower()
    ]
    if not denies:
        sys.exit("no agentgateway deny line for the attacker server")
    for line in denies[-2:]:
        block(line)
    say("")
    say("live GET /report on the sandboxed attacker server")
    block(json.dumps(redact(attacker_server_report("kind-lab02-sandboxed")), indent=2))


def scene_scorecard() -> None:
    say("score.sh compare, from the JSON files this cluster produced")
    say("")
    repo = LAB.parents[1]
    text = run(
        [
            "python3",
            str(repo / "scoring" / "score_lab02.py"),
            "--compare",
            str(RESULTS / "bare.json"),
            str(RESULTS / "sandboxed.json"),
            str(RESULTS / "recovered.json"),
        ]
    )
    for line in text.splitlines():
        say(line)


SCENES = {
    "bare-leak": scene_bare_leak,
    "replay": scene_replay,
    "sandboxed-block": scene_sandboxed_block,
    "scorecard": scene_scorecard,
}


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in SCENES:
        names = ", ".join(SCENES)
        sys.exit(f"usage: show.py {{{names}}}")
    SCENES[sys.argv[1]]()


if __name__ == "__main__":
    main()
