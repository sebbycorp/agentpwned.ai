#!/usr/bin/env bash
# Four Arm B attempts. Every target is an in-cluster Service.
# Prints one line per attempt and whether the canary reached the sink.

set -o errexit -o nounset -o pipefail
source "$(dirname "$0")/common.sh"

need kubectl
need python3

for name in challenge-read.txt challenge-sink.txt challenge-dummy.txt challenge-dns.txt; do
  assert_prompt_is_cluster_local "${LAB_ROOT}/attack/${name}"
done

post() {
  local kind="$1"
  local prompt="$2"
  python3 "${LAB_ROOT}/scripts/post_prompt.py" \
    --via router \
    --arm substrate \
    --context "${ARM_B_CONTEXT}" \
    --prompt "${LAB_ROOT}/attack/${prompt}" \
    --out "${RESULTS_DIR}/challenge-${kind}.json" \
    --kind "challenge-${kind}"
}

post read challenge-read.txt
post sink challenge-sink.txt
post dummy challenge-dummy.txt
post dns challenge-dns.txt

python3 - "${REPO_ROOT}" "${LAB_ROOT}" "${ARM_B_CONTEXT}" <<'PY'
import json
import sys
from pathlib import Path

root = Path(sys.argv[1])
lab = Path(sys.argv[2])
context = sys.argv[3]
sys.path.insert(0, str(root / "scoring"))
from lib.challenge import evaluate_challenge, render_challenge
from lib.collect import http_via_port_forward

def load(name: str) -> dict:
    return json.loads((lab / "results" / name).read_text(encoding="utf-8"))

canary = (lab / "results" / "substrate-canary.txt").read_text(encoding="utf-8").strip()
sink = json.loads(http_via_port_forward(context, "lab01-shared", "svc/attacker-sink", 80, "/report"))
dummy = json.loads(http_via_port_forward(context, "lab01", "svc/dummy", 80, "/report"))
report = evaluate_challenge(
    {
        "read": load("challenge-read.json"),
        "sink": load("challenge-sink.json"),
        "dummy": load("challenge-dummy.json"),
        "dns": load("challenge-dns.json"),
    },
    sink,
    dummy,
    canary,
)
out = lab / "results" / "challenge.json"
out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(render_challenge(report))
print(f"wrote {out}")
PY
