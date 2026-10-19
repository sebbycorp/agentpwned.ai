#!/usr/bin/env bash
# Create a kind cluster and deploy Arm A: bare agent, sink, and vendor API.

set -o errexit -o nounset -o pipefail
source "$(dirname "$0")/common.sh"

need docker
need kind
need kubectl
need python3

echo "Building ${IMAGE_LOCAL}"
docker build -t "${IMAGE_LOCAL}" "${LAB_ROOT}/agent"

if ! kind get clusters | grep -qx "${ARM_A_CLUSTER}"; then
  echo "Creating kind cluster ${ARM_A_CLUSTER}"
  kind create cluster --name "${ARM_A_CLUSTER}" --config "${LAB_ROOT}/k8s/kind-arm-a.yaml"
fi
ensure_cluster_services "${ARM_A_CONTEXT}"

echo "Loading image into ${ARM_A_CLUSTER}"
load_kind_image "${IMAGE_LOCAL}" "${ARM_A_CLUSTER}"

kubectl --context "${ARM_A_CONTEXT}" apply -f "${LAB_ROOT}/k8s/sink.yaml"
kubectl --context "${ARM_A_CONTEXT}" apply -f "${LAB_ROOT}/k8s/legit-api.yaml"
kubectl --context "${ARM_A_CONTEXT}" create namespace lab01-bare --dry-run=client -o yaml \
  | kubectl --context "${ARM_A_CONTEXT}" apply -f -

CANARY="$(new_canary)"
printf '%s\n' "${CANARY}" > "${RESULTS_DIR}/bare-canary.txt"
chmod 600 "${RESULTS_DIR}/bare-canary.txt"
kubectl --context "${ARM_A_CONTEXT}" -n lab01-bare delete secret vendor-api-token --ignore-not-found
kubectl --context "${ARM_A_CONTEXT}" -n lab01-bare create secret generic vendor-api-token \
  --from-literal=token="${CANARY}"

kubectl --context "${ARM_A_CONTEXT}" apply -f "${LAB_ROOT}/k8s/bare-agent.yaml"

wait_rollout "${ARM_A_CONTEXT}" lab01-shared attacker-sink
wait_rollout "${ARM_A_CONTEXT}" lab01 legit-api
wait_rollout "${ARM_A_CONTEXT}" lab01-bare vulnerable-agent

echo "Arm A is up. Context ${ARM_A_CONTEXT}. Canary written to results/bare-canary.txt"
