#!/usr/bin/env bash
# Shared helpers for Lab 01. Source this file; do not execute it.

set -o errexit -o nounset -o pipefail

LAB_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "${LAB_ROOT}/../.." && pwd)"
RESULTS_DIR="${LAB_ROOT}/results"
IMAGE_LOCAL="lab01-agent:local"
IMAGE_REGISTRY="localhost:5001/lab01-agent:local"
ARM_A_CLUSTER="lab01-bare"
ARM_A_CONTEXT="kind-${ARM_A_CLUSTER}"
ARM_B_CLUSTER="${KIND_CLUSTER_NAME:-kind}"
ARM_B_CONTEXT="kind-${ARM_B_CLUSTER}"
SUBSTRATE_REF="${SUBSTRATE_REF:-v0.5.0}"
SUBSTRATE_SRC="${SUBSTRATE_SRC:-${HOME}/.cache/agentpwned/substrate}"

export PATH="/usr/local/go/bin:${HOME}/.local/bin:${PATH}"

mkdir -p "${RESULTS_DIR}"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing command: $1" >&2
    exit 1
  fi
}

new_canary() {
  python3 -c 'import secrets; print("lab01_canary_" + secrets.token_hex(12))'
}

wait_rollout() {
  local context="$1" namespace="$2" deploy="$3"
  kubectl --context "${context}" -n "${namespace}" rollout status "deploy/${deploy}" --timeout=180s
}

# Kernels that reject the iptables statistic match leave kube-proxy unable to
# program ClusterIP. In-cluster DNS then fails. Switch that cluster to the
# nftables proxier. No-op when the failure is absent.
ensure_cluster_services() {
  local context="$1"
  local logs
  logs="$(kubectl --context "${context}" -n kube-system logs daemonset/kube-proxy --tail=100 2>/dev/null || true)"
  if ! printf '%s\n' "${logs}" | grep -q 'Extension statistic revision 0'; then
    return 0
  fi
  echo "kube-proxy iptables mode failed (statistic match unsupported). Switching to nftables."
  kubectl --context "${context}" -n kube-system get configmap kube-proxy -o json \
    | python3 -c 'import json,sys; cm=json.load(sys.stdin); cm["data"]["config.conf"]=cm["data"]["config.conf"].replace("mode: iptables","mode: nftables",1); json.dump(cm, sys.stdout)' \
    | kubectl --context "${context}" apply -f -
  kubectl --context "${context}" -n kube-system delete pod -l k8s-app=kube-proxy
  kubectl --context "${context}" -n kube-system rollout status daemonset/kube-proxy --timeout=180s
}

# Refuse to post the lab prompt if it has been edited to name a non-cluster host.
assert_prompt_is_cluster_local() {
  local file="$1"
  python3 - "${file}" <<'PY'
import sys
from pathlib import Path
from urllib.parse import urlparse
import re
text = Path(sys.argv[1]).read_text()
urls = re.findall(r"https?://[^\s<>'\"`]+", text)
if not urls:
    sys.exit("prompt has no URL")
for raw in urls:
    parsed = urlparse(raw.rstrip(").,;"))
    host = (parsed.hostname or "").lower().rstrip(".")
    if host.endswith(".svc.cluster.local") or host.endswith(".svc"):
        continue
    sys.exit(f"refusing prompt URL outside the cluster: {raw}")
PY
}
