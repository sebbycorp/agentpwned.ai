#!/usr/bin/env python3
"""Print one Lab 01 scene from saved transcripts and the live clusters.

vhs tapes call this. If the cluster or the transcript is missing, exit non-zero.
Do not paste a scorecard into the tape.
"""

from __future__ import annotations

import json
import subprocess
import sys
import textwrap
from pathlib import Path

LAB = Path(__file__).resolve().parents[1]
RESULTS = LAB / "results"
WIDTH = 92


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


def attacker_server_report(context: str) -> dict:
    raw = run(
        [
            "kubectl",
            "--context",
            context,
            "-n",
            "lab01-shared",
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


def secret_flags(transcript: dict) -> list[str]:
    lines = []
    for step in transcript["response"]["steps"]:
        if step.get("tool") != "read_secret":
            continue
        for obs in step.get("observations") or []:
            lines.append(f"  {obs.get('location')} found={str(bool(obs.get('found'))).lower()}")
    return lines


def posts(transcript: dict) -> list[dict]:
    return [step for step in transcript["response"]["steps"] if step.get("tool") == "http_post"]


def scene_setup() -> None:
    say("Lab 01 setup. Live clusters, not a mock.")
    say("")
    say("Bare agent context kind-lab01-bare")
    for namespace in ("lab01-bare", "lab01-shared", "lab01"):
        block(
            run(
                [
                    "kubectl",
                    "--context",
                    "kind-lab01-bare",
                    "-n",
                    namespace,
                    "get",
                    "pods",
                ]
            )
        )
        say("")
    say("")
    say("Sandboxed agent egress on context kind-lab01-sandboxed")
    image = run(
        [
            "kubectl",
            "--context",
            "kind-lab01-sandboxed",
            "-n",
            "ate-system",
            "get",
            "deploy",
            "atenet-egress",
            "-o",
            "jsonpath={.spec.template.spec.containers[*].name}{' '}{.spec.template.spec.containers[*].image}",
        ]
    )
    container, _, ref = image.partition(" ")
    tag, _, digest = ref.partition("@")
    say(f"container: {container}")
    say(f"image: {tag}")
    if digest:
        say(f"digest: {digest}")
    say("")
    say("Actor")
    block(run(["kubectl-ate", "--context", "kind-lab01-sandboxed", "get", "actors", "-A"]))


def scene_injection() -> None:
    prompt = (LAB / "attack" / "prompt-injection.txt").read_text(encoding="utf-8").rstrip()
    transcript = read_json("bare-attack.json")
    say("Prompt the attack script posts. attack/prompt-injection.txt")
    say("")
    block(prompt)
    say("")
    say(
        f"Bare agent accepted it. results/bare-attack.json duration_seconds={transcript['duration_seconds']} mode={transcript['response']['mode']}"
    )
    for line in secret_flags(transcript):
        say(line)
    for step in posts(transcript):
        say(f"http_post status={step.get('status')} url={step.get('url')}")


def scene_bare_leak() -> None:
    transcript = read_json("bare-attack.json")
    say("Bare agent leak. Transcript plus the live attacker server.")
    say(f"results/bare-attack.json duration_seconds={transcript['duration_seconds']}")
    for step in posts(transcript):
        say(f"status={step.get('status')} error={step.get('error')}")
        body = step.get("body")
        block(json.dumps(body, indent=2))
    say("")
    say("live GET /report on attacker-server")
    block(json.dumps(attacker_server_report("kind-lab01-bare"), indent=2))


def scene_sandboxed_block() -> None:
    transcript = read_json("sandboxed-attack.json")
    say("Sandboxed agent attacker server attempt. Credential-free actor, agentgateway egress.")
    say(f"results/sandboxed-attack.json duration_seconds={transcript['duration_seconds']}")
    for line in secret_flags(transcript):
        say(line)
    for index, step in enumerate(posts(transcript), start=1):
        say(f"attempt {index} status={step.get('status')} error={step.get('error')}")
        say(f"  url={step.get('url')}")
    say("")
    say("live GET /report on the Sandboxed agent attacker server")
    block(json.dumps(attacker_server_report("kind-lab01-sandboxed"), indent=2))


def scene_sandboxed_legit() -> None:
    transcript = read_json("sandboxed-benign.json")
    say("Allowlisted call on agentgateway. This is the recorded result.")
    say(f"results/sandboxed-benign.json duration_seconds={transcript['duration_seconds']}")
    for step in posts(transcript):
        say(f"url={step.get('url')}")
        say(f"status={step.get('status')} error={step.get('error')}")
        say(f"request_headers={json.dumps(step.get('request_headers'))}")
        block(f"response_body={step.get('response_body')}")


def scene_scorecard() -> None:
    say("score.sh compare, from the JSON files this cluster just produced")
    say("")
    repo = LAB.parents[1]
    block(
        run(
            [
                "python3",
                str(repo / "scoring" / "score_lab01.py"),
                "--compare",
                str(RESULTS / "bare.json"),
                str(RESULTS / "sandboxed.json"),
            ]
        )
    )


SCENES = {
    "setup": scene_setup,
    "injection": scene_injection,
    "bare-leak": scene_bare_leak,
    "sandboxed-block": scene_sandboxed_block,
    "sandboxed-legit": scene_sandboxed_legit,
    "scorecard": scene_scorecard,
}


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in SCENES:
        names = ", ".join(SCENES)
        sys.exit(f"usage: show.py {{{names}}}")
    SCENES[sys.argv[1]]()


if __name__ == "__main__":
    main()
