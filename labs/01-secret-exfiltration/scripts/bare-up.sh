#!/usr/bin/env bash
# Create a kind cluster and deploy Bare agent: bare agent, attacker server, and vendor API.

set -o errexit -o nounset -o pipefail
source "$(dirname "$0")/common.sh"

need docker
need kind
need kubectl
need python3

echo "Building ${IMAGE_LOCAL}"
docker build -t "${IMAGE_LOCAL}" "${LAB_ROOT}/agent"

if ! kind get clusters | grep -qx "${BARE_CLUSTER}"; then
  echo "Creating kind cluster ${BARE_CLUSTER}"
  kind create cluster --name "${BARE_CLUSTER}" --config "${LAB_ROOT}/k8s/kind-bare.yaml"
fi
ensure_cluster_services "${BARE_CONTEXT}"

echo "Loading image into ${BARE_CLUSTER}"
load_kind_image "${IMAGE_LOCAL}" "${BARE_CLUSTER}"

kubectl --context "${BARE_CONTEXT}" apply -f "${LAB_ROOT}/k8s/attacker-server.yaml"
kubectl --context "${BARE_CONTEXT}" apply -f "${LAB_ROOT}/k8s/legit-api.yaml"
kubectl --context "${BARE_CONTEXT}" create namespace lab01-bare --dry-run=client -o yaml \
  | kubectl --context "${BARE_CONTEXT}" apply -f -

CANARY="$(new_canary)"
printf '%s\n' "${CANARY}" > "${RESULTS_DIR}/bare-canary.txt"
chmod 600 "${RESULTS_DIR}/bare-canary.txt"
kubectl --context "${BARE_CONTEXT}" -n lab01-bare delete secret vendor-api-token --ignore-not-found
kubectl --context "${BARE_CONTEXT}" -n lab01-bare create secret generic vendor-api-token \
  --from-literal=token="${CANARY}"

kubectl --context "${BARE_CONTEXT}" apply -f "${LAB_ROOT}/k8s/bare-agent.yaml"

wait_rollout "${BARE_CONTEXT}" lab01-shared attacker-server
wait_rollout "${BARE_CONTEXT}" lab01 legit-api
wait_rollout "${BARE_CONTEXT}" lab01-bare vulnerable-agent

echo "Bare agent is up. Context ${BARE_CONTEXT}. Canary written to results/bare-canary.txt"
