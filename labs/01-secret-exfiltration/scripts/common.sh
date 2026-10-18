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
# nftables proxier. No-op when the match exists and kube-proxy has not logged
# the failure. The log line appears a few seconds after the apiserver is up,
# so a present match is polled briefly.
ensure_cluster_services() {
  local context="$1"
  local cluster="${context#kind-}"
  local matches=""
  local logs=""
  local attempt
  matches="$(docker exec "${cluster}-control-plane" cat /proc/net/ip_tables_matches 2>/dev/null || true)"
  if ! printf '%s\n' "${matches}" | grep -qx 'statistic'; then
    echo "iptables statistic match is missing. Switching kube-proxy to nftables." >&2
    _switch_kube_proxy_nftables "${context}"
    return 0
  fi
  for attempt in 1 2 3 4; do
    logs="$(kubectl --context "${context}" -n kube-system logs daemonset/kube-proxy --tail=200 2>/dev/null || true)"
    if printf '%s\n' "${logs}" | grep -q 'Extension statistic revision 0'; then
      echo "kube-proxy iptables mode failed (statistic match unsupported). Switching to nftables." >&2
      _switch_kube_proxy_nftables "${context}"
      return 0
    fi
    sleep 2
  done
}

_switch_kube_proxy_nftables() {
  local context="$1"
  local mode
  mode="$(kubectl --context "${context}" -n kube-system get configmap kube-proxy -o jsonpath='{.data.config\.conf}' \
    | awk '/^mode:/{print $2; exit}')"
  if [[ "${mode}" == "nftables" ]]; then
    echo "kube-proxy is already nftables." >&2
    return 0
  fi
  kubectl --context "${context}" -n kube-system get configmap kube-proxy -o json \
    | python3 -c 'import json,sys; cm=json.load(sys.stdin); cm["data"]["config.conf"]=cm["data"]["config.conf"].replace("mode: iptables","mode: nftables",1); json.dump(cm, sys.stdout)' \
    | kubectl --context "${context}" apply -f -
  kubectl --context "${context}" -n kube-system delete pod -l k8s-app=kube-proxy --wait=false
  kubectl --context "${context}" -n kube-system rollout status daemonset/kube-proxy --timeout=180s
}

# kind load rejects some containerd config versions. Fall back to ctr import
# and retag the image to the name the lab Deployments pull.
load_kind_image() {
  local image="$1"
  local cluster="$2"
  if kind load docker-image "${image}" --name "${cluster}"; then
    return 0
  fi
  echo "kind load failed. Importing ${image} with ctr." >&2
  docker save "${image}" | docker exec -i "${cluster}-control-plane" ctr -n k8s.io images import -
  docker exec "${cluster}-control-plane" ctr -n k8s.io images tag \
    "${image}" "docker.io/library/${IMAGE_LOCAL}"
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
dns_hosts = re.findall(r"(?m)^dns:\s*(\S+)\s*$", text)
for raw in urls:
    parsed = urlparse(raw.rstrip(").,;"))
    host = (parsed.hostname or "").lower().rstrip(".")
    if host.endswith(".svc.cluster.local") or host.endswith(".svc"):
        continue
    sys.exit(f"refusing prompt URL outside the cluster: {raw}")
for raw in dns_hosts:
    host = raw.lower().rstrip(".")
    if host.endswith(".svc.cluster.local") or host.endswith(".svc"):
        continue
    sys.exit(f"refusing prompt DNS name outside the cluster: {raw}")
PY
}
