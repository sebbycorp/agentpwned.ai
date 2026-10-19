#!/usr/bin/env bash
# Shared helpers for Lab 02. Source this file; do not execute it.
# Pinning, kind image load, and the kube-proxy workaround come from Lab 01.

set -o errexit -o nounset -o pipefail

_LAB02_SCRIPTS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../01-secret-exfiltration/scripts/common.sh
source "${_LAB02_SCRIPTS}/../../01-secret-exfiltration/scripts/common.sh"

LAB_ROOT="$(cd "${_LAB02_SCRIPTS}/.." && pwd)"
REPO_ROOT="$(cd "${LAB_ROOT}/../.." && pwd)"
RESULTS_DIR="${LAB_ROOT}/results"
IMAGE_LOCAL="lab02-agent:local"
IMAGE_REGISTRY="localhost:5001/lab02-agent:local"
BARE_CLUSTER="lab02-bare"
BARE_CONTEXT="kind-${BARE_CLUSTER}"
# Lab 01's common.sh already assigns SANDBOXED_CLUSTER. Set this lab's name
# after that source so the default does not keep the Lab 01 cluster.
SANDBOXED_CLUSTER="${LAB02_SANDBOXED_CLUSTER:-lab02-sandboxed}"
SANDBOXED_CONTEXT="kind-${SANDBOXED_CLUSTER}"
ATESPACE="lab02"
ACTOR_NAME="assistant-1"
TEMPLATE_NAME="sleeper-agent"
TAG_NAME="known-good"

mkdir -p "${RESULTS_DIR}"

new_canary() {
  python3 -c 'import secrets; print("lab02_canary_" + secrets.token_hex(12))'
}

new_session_canary() {
  python3 -c 'import secrets; print("lab02_session_" + secrets.token_hex(8))'
}

actor_state() {
  kubectl-ate --context "${SANDBOXED_CONTEXT}" get actor "${ACTOR_NAME}" -a "${ATESPACE}" -o json \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("status",{}).get("state",""))'
}

wait_actor_running() {
  local label="${1:-actor}"
  echo "Waiting for ${label} to report RUNNING"
  local state=""
  for _ in $(seq 1 60); do
    state="$(actor_state)"
    echo "actor state: ${state}"
    if [[ "${state}" == "ACTOR_STATE_RUNNING" ]]; then
      return 0
    fi
    sleep 5
  done
  echo "${label} did not reach RUNNING (last state: ${state})" >&2
  kubectl-ate --context "${SANDBOXED_CONTEXT}" get actor "${ACTOR_NAME}" -a "${ATESPACE}" -o yaml || true
  return 1
}
