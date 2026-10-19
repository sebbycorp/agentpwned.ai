#!/usr/bin/env bash
# Shared helpers for Lab 01. Source this file; do not execute it.

set -o errexit -o nounset -o pipefail

LAB_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "${LAB_ROOT}/../.." && pwd)"
RESULTS_DIR="${LAB_ROOT}/results"
IMAGE_LOCAL="lab01-agent:local"
IMAGE_REGISTRY="localhost:5001/lab01-agent:local"
BARE_CLUSTER="lab01-bare"
BARE_CONTEXT="kind-${BARE_CLUSTER}"
SANDBOXED_CLUSTER="${SANDBOXED_CLUSTER:-lab01-sandboxed}"
SANDBOXED_CONTEXT="kind-${SANDBOXED_CLUSTER}"
# Unreleased Substrate main. Pre-1.0. v0.5.0 plus its pinned agentgateway
# image returns HTTP 403 "name: Required value": GetActorEgressPolicy is
# called without name=default, and v0.5.0 does not issue the worker-for-actor
# certificate that agentgateway PR 3990 requires.
SUBSTRATE_REF="${SUBSTRATE_REF:-3d3b92921bd68931c509e1b5bd57df00e76ffff0}"
SUBSTRATE_SRC="${SUBSTRATE_SRC:-${HOME}/.cache/agentpwned/substrate}"
# agentgateway git revision 955d56fae09b45f3cb8e85e797dbb1eb06134f77, which
# includes PR 3990. Pinned by digest. Do not use the floating latest-dev tag.
AGENTGATEWAY_IMAGE="${AGENTGATEWAY_IMAGE:-cr.agentgateway.dev/agentgateway@sha256:fc64f1093a5f7fd32c9cc58d2b53f0a5d5781f7960e3a1ac0a59db4f6a39850f}"

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

# Kernels without the iptables multiport match cannot program hostPort DNAT.
# Atelet is dialed on its pod IP (Substrate dialer.go), so this lab can drop
# that hostPort. Poll while the installer applies the DaemonSet.
relax_atelet_hostport() {
  local context="$1"
  local cluster="${context#kind-}"
  local matches
  matches="$(docker exec "${cluster}-control-plane" cat /proc/net/ip_tables_matches 2>/dev/null || true)"
  if printf '%s\n' "${matches}" | grep -qx multiport; then
    return 0
  fi
  echo "iptables multiport match is missing. Dropping atelet hostPort." >&2
  (
    local host_port
    for _ in $(seq 1 400); do
      host_port="$(kubectl --context "${context}" -n ate-system get ds atelet -o jsonpath='{.spec.template.spec.containers[0].ports[0].hostPort}' 2>/dev/null || true)"
      if [[ -n "${host_port}" ]]; then
        kubectl --context "${context}" -n ate-system patch ds atelet --type json \
          -p '[{"op":"remove","path":"/spec/template/spec/containers/0/ports/0/hostPort"}]' >/dev/null
        echo "removed atelet hostPort ${host_port}" >&2
      fi
      sleep 2
    done
  ) &
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

# Fetch the pinned commit. A tag clone cannot select a raw SHA, and a checkout
# that is not this commit is not the lab.
pin_substrate_checkout() {
  local head=""
  mkdir -p "$(dirname "${SUBSTRATE_SRC}")"
  if [[ ! -e "${SUBSTRATE_SRC}/.git" ]]; then
    if [[ -e "${SUBSTRATE_SRC}" ]] && [[ -n "$(ls -A "${SUBSTRATE_SRC}" 2>/dev/null || true)" ]]; then
      echo "${SUBSTRATE_SRC} exists and is not a git checkout" >&2
      exit 1
    fi
    mkdir -p "${SUBSTRATE_SRC}"
    git -C "${SUBSTRATE_SRC}" init
    git -C "${SUBSTRATE_SRC}" remote add origin https://github.com/agent-substrate/substrate.git
  fi
  if ! git -C "${SUBSTRATE_SRC}" remote get-url origin >/dev/null 2>&1; then
    git -C "${SUBSTRATE_SRC}" remote add origin https://github.com/agent-substrate/substrate.git
  fi
  head="$(git -C "${SUBSTRATE_SRC}" rev-parse HEAD 2>/dev/null || true)"
  if [[ "${head}" != "${SUBSTRATE_REF}" ]]; then
    echo "Fetching Substrate ${SUBSTRATE_REF}"
    git -C "${SUBSTRATE_SRC}" fetch --depth 1 origin "${SUBSTRATE_REF}"
    git -C "${SUBSTRATE_SRC}" checkout --detach FETCH_HEAD
  fi
  head="$(git -C "${SUBSTRATE_SRC}" rev-parse HEAD)"
  if [[ "${head}" != "${SUBSTRATE_REF}" ]]; then
    echo "Substrate checkout ${head} is not ${SUBSTRATE_REF}" >&2
    exit 1
  fi
  echo "Substrate checkout: ${head}"
}

# Substrate main at this commit still pins an older agentgateway alpha image.
# Rewrite both kustomize image lines to the digest above before install.
pin_agentgateway_image() {
  local file="${SUBSTRATE_SRC}/manifests/ate-install/components/agentgateway/kustomization.yaml"
  python3 - "${file}" "${AGENTGATEWAY_IMAGE}" <<'PY'
import pathlib, sys
path, image = sys.argv[1:]
file = pathlib.Path(path)
lines = file.read_text().splitlines(keepends=True)
count = 0
out = []
for line in lines:
    stripped = line.lstrip()
    if stripped.startswith("image: cr.agentgateway.dev/agentgateway"):
        indent = line[: len(line) - len(stripped)]
        newline = "\n" if line.endswith("\n") else ""
        out.append(f"{indent}image: {image}{newline}")
        count += 1
    else:
        out.append(line)
if count != 2:
    sys.exit(f"expected 2 agentgateway image lines in {path}, found {count}")
file.write_text("".join(out))
print(f"pinned {count} agentgateway image lines")
PY
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
