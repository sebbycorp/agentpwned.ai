#!/usr/bin/env python3
"""Send a lab prompt to the agent and save the response.

Arm A posts through kubectl exec, so the request stays inside the pod.
Arm B posts through atenet-router with the ate-target-actor header.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

def post_exec(context: str, namespace: str, deploy: str, container: str, body: bytes) -> str:
    code = (
        "import sys, urllib.request\n"
        "payload = sys.stdin.buffer.read()\n"
        "req = urllib.request.Request('http://127.0.0.1:80/run', data=payload, method='POST')\n"
        "req.add_header('Content-Type', 'application/json')\n"
        "with urllib.request.urlopen(req, timeout=30) as resp:\n"
        "    sys.stdout.buffer.write(resp.read())\n"
    )
    completed = subprocess.run(
        [
            "kubectl",
            "--context",
            context,
            "-n",
            namespace,
            "exec",
            "-i",
            f"deploy/{deploy}",
            "-c",
            container,
            "--",
            "python3",
            "-c",
            code,
        ],
        input=body,
        capture_output=True,
        timeout=60,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.decode("utf-8", errors="replace"))
    return completed.stdout.decode("utf-8", errors="replace")


def post_router(context: str, body: bytes) -> str:
    # Reuse the port-forward helper for a POST by doing the forward here.
    import socket

    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        local_port = probe.getsockname()[1]
    proc = subprocess.Popen(
        [
            "kubectl",
            "--context",
            context,
            "-n",
            "ate-system",
            "port-forward",
            "svc/atenet-router",
            f"{local_port}:80",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    try:
        deadline = time.time() + 30
        while time.time() < deadline:
            if proc.poll() is not None:
                raise RuntimeError(proc.stdout.read() if proc.stdout else "port-forward exited")
            try:
                with socket.create_connection(("127.0.0.1", local_port), timeout=0.3):
                    break
            except OSError:
                time.sleep(0.2)
        else:
            raise RuntimeError("atenet-router port-forward did not become ready")
        request = urllib.request.Request(
            f"http://127.0.0.1:{local_port}/run",
            data=body,
            method="POST",
        )
        request.add_header("Content-Type", "application/json")
        request.add_header("ate-target-actor", "lab01/exfil-agent")
        with urllib.request.urlopen(request, timeout=40) as response:
            return response.read().decode("utf-8", errors="replace")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--via", choices=("exec", "router"), required=True)
    parser.add_argument("--context", required=True)
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--namespace", default="lab01-bare")
    parser.add_argument("--deploy", default="vulnerable-agent")
    parser.add_argument("--container", default="agent")
    parser.add_argument("--kind", default="attack")
    parser.add_argument("--arm", required=True)
    args = parser.parse_args()

    prompt = Path(args.prompt).read_text(encoding="utf-8")
    body = json.dumps({"prompt": prompt, "mode": "mock"}).encode("utf-8")
    started = time.time()
    if args.via == "exec":
        raw = post_exec(args.context, args.namespace, args.deploy, args.container, body)
    else:
        raw = post_router(args.context, body)
    duration = round(time.time() - started, 3)
    try:
        response = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"agent returned non-JSON: {exc}\n{raw[:500]}") from exc
    envelope = {
        "arm": args.arm,
        "kind": args.kind,
        "duration_seconds": duration,
        "response": response,
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(envelope, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {out} ({duration}s, mode={response.get('mode')})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
