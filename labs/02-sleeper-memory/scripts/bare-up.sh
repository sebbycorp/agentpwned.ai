#!/usr/bin/env bash
# Create a kind cluster and deploy the bare agent, ticket server, attacker server, and vendor API.

set -o errexit -o nounset -o pipefail
source "$(dirname "$0")/common.sh"

need docker
need kind
need kubectl
need python3

echo "Building ${IMAGE_LOCAL}"
docker build -t "${IMAGE_LOCAL}" "${LAB_ROOT}/agent"

# kind-bare.yaml pins kindest/node v1.37.0. kind 0.29 writes kubeadm v1beta3,
# which that image rejects, and its default v1.33.1 kube-proxy nftables build
# exits with "too many open files" on kernel 6.12.
kind_ver="$(kind version 2>/dev/null | awk '{print $2}' | sed 's/^v//')"
python3 - "${kind_ver}" <<'PY'
import sys
raw = sys.argv[1]
parts = [int(p) for p in raw.split(".")[:2]] if raw else [0, 0]
if parts < [0, 31]:
    sys.exit(
        f"kind {raw or 'missing'} is too old for kindest/node v1.37.0. "
        "Install kind 0.31 or newer."
    )
PY

if ! kind get clusters | grep -qx "${BARE_CLUSTER}"; then
  echo "Creating kind cluster ${BARE_CLUSTER}"
  kind create cluster --name "${BARE_CLUSTER}" --config "${LAB_ROOT}/k8s/kind-bare.yaml"
fi
ensure_cluster_services "${BARE_CONTEXT}"

echo "Loading image into ${BARE_CLUSTER}"
load_kind_image "${IMAGE_LOCAL}" "${BARE_CLUSTER}"

kubectl --context "${BARE_CONTEXT}" apply -f "${LAB_ROOT}/k8s/attacker-server.yaml"
kubectl --context "${BARE_CONTEXT}" apply -f "${LAB_ROOT}/k8s/ticket-server.yaml"
kubectl --context "${BARE_CONTEXT}" apply -f "${LAB_ROOT}/k8s/legit-api.yaml"
kubectl --context "${BARE_CONTEXT}" create namespace lab02-bare --dry-run=client -o yaml \
  | kubectl --context "${BARE_CONTEXT}" apply -f -

CANARY="$(new_canary)"
printf '%s\n' "${CANARY}" > "${RESULTS_DIR}/bare-canary.txt"
chmod 600 "${RESULTS_DIR}/bare-canary.txt"
kubectl --context "${BARE_CONTEXT}" -n lab02-bare delete secret vendor-api-token --ignore-not-found
kubectl --context "${BARE_CONTEXT}" -n lab02-bare create secret generic vendor-api-token \
  --from-literal=token="${CANARY}"

kubectl --context "${BARE_CONTEXT}" apply -f "${LAB_ROOT}/k8s/bare-agent.yaml"

wait_rollout "${BARE_CONTEXT}" lab02-shared attacker-server
wait_rollout "${BARE_CONTEXT}" lab02-shared ticket-server
wait_rollout "${BARE_CONTEXT}" lab02 legit-api
wait_rollout "${BARE_CONTEXT}" lab02-bare bare-agent

echo "Bare agent is up. Context ${BARE_CONTEXT}. Canary written to results/bare-canary.txt"
