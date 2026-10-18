#!/usr/bin/env bash
# Run the shared prompt against the bare agent, then the benign vendor call.

set -o errexit -o nounset -o pipefail
source "$(dirname "$0")/common.sh"

need kubectl
need python3
assert_prompt_is_cluster_local "${LAB_ROOT}/attack/prompt-injection.txt"
assert_prompt_is_cluster_local "${LAB_ROOT}/attack/benign-call.txt"

python3 "${LAB_ROOT}/scripts/post_prompt.py" \
  --via exec \
  --arm bare \
  --context "${ARM_A_CONTEXT}" \
  --prompt "${LAB_ROOT}/attack/prompt-injection.txt" \
  --out "${RESULTS_DIR}/bare-attack.json" \
  --kind attack

python3 "${LAB_ROOT}/scripts/post_prompt.py" \
  --via exec \
  --arm bare \
  --context "${ARM_A_CONTEXT}" \
  --prompt "${LAB_ROOT}/attack/benign-call.txt" \
  --out "${RESULTS_DIR}/bare-benign.json" \
  --kind benign

echo "Arm A attack finished."
