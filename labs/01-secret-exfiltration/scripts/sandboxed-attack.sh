#!/usr/bin/env bash
# Run the same prompts against the Substrate actor.

set -o errexit -o nounset -o pipefail
source "$(dirname "$0")/common.sh"

need kubectl
need python3
assert_prompt_is_cluster_local "${LAB_ROOT}/attack/prompt-injection.txt"
assert_prompt_is_cluster_local "${LAB_ROOT}/attack/benign-call.txt"

python3 "${LAB_ROOT}/scripts/post_prompt.py" \
  --via router \
  --agent sandboxed \
  --context "${SANDBOXED_CONTEXT}" \
  --prompt "${LAB_ROOT}/attack/prompt-injection.txt" \
  --out "${RESULTS_DIR}/sandboxed-attack.json" \
  --kind attack

python3 "${LAB_ROOT}/scripts/post_prompt.py" \
  --via router \
  --agent sandboxed \
  --context "${SANDBOXED_CONTEXT}" \
  --prompt "${LAB_ROOT}/attack/benign-call.txt" \
  --out "${RESULTS_DIR}/sandboxed-benign.json" \
  --kind benign

python3 - "${REPO_ROOT}" "${SANDBOXED_CONTEXT}" "${RESULTS_DIR}/sandboxed-inspect.json" <<'PY'
import sys
from pathlib import Path
sys.path.insert(0, str(Path(sys.argv[1]) / "scoring"))
from lib.collect import http_via_port_forward
raw = http_via_port_forward(
    sys.argv[2],
    "ate-system",
    "svc/atenet-router",
    80,
    "/inspect",
    headers={"ate-target-actor": "lab01/exfil-agent"},
)
Path(sys.argv[3]).write_text(raw + "\n", encoding="utf-8")
print(f"wrote {sys.argv[3]}")
PY

echo "Sandboxed agent attack finished."
