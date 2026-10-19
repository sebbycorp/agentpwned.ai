#!/usr/bin/env bash
# Install Agent Substrate main at SUBSTRATE_REF with agentgateway, then the lab actor.
#
# Follows hack/create-kind-cluster.sh and hack/install-ate-kind.sh.
# The install builds images from the Substrate checkout (Go 1.27 or newer)
# unless ATE_IMAGE_REPO and ATE_IMAGE_TAG point at a published image set.

set -o errexit -o nounset -o pipefail
source "$(dirname "$0")/common.sh"

need docker
need git
need go
need kubectl
need python3

export KIND_CLUSTER_NAME="${SANDBOXED_CLUSTER}"
export KUBECTL_CONTEXT="${SANDBOXED_CONTEXT}"

go_major="$(go env GOVERSION | sed 's/^go//')"
python3 - "${go_major}" <<'PY'
import sys
parts = [int(p) for p in sys.argv[1].split(".")[:2]]
if parts < [1, 27]:
    sys.exit(f"Go {sys.argv[1]} is too old. This Substrate pin requires Go 1.27 or newer.")
PY

if kind get clusters 2>/dev/null | grep -qx "${BARE_CLUSTER}"; then
  echo "Deleting ${BARE_CLUSTER} so this machine has room for Substrate."
  kind delete cluster --name "${BARE_CLUSTER}" || true
fi

pin_substrate_checkout

(
  cd "${SUBSTRATE_SRC}"
  hack/create-kind-cluster.sh
)
ensure_cluster_services "${SANDBOXED_CONTEXT}"

echo "Building ${IMAGE_REGISTRY} and pushing it to the kind registry"
docker build -t "${IMAGE_REGISTRY}" "${LAB_ROOT}/agent"
push_log="$(docker push "${IMAGE_REGISTRY}")"
echo "${push_log}"
digest="$(printf '%s\n' "${push_log}" | awk '/digest: sha256:/ {print $3}' | tail -1)"
if [[ -z "${digest}" ]]; then
  echo "docker push did not report a digest" >&2
  exit 1
fi
image_ref="localhost:5001/lab02-agent@${digest}"
echo "Actor image ${image_ref}"
printf '%s\n' "${image_ref}" > "${RESULTS_DIR}/actor-image.txt"

export KO_DOCKER_REPO="${KO_DOCKER_REPO:-localhost:5001}"
export GOMAXPROCS="${GOMAXPROCS:-2}"

pin_agentgateway_image
echo "Atenet dataplane: agentgateway (${AGENTGATEWAY_IMAGE})"

relax_atelet_hostport "${SANDBOXED_CONTEXT}"

(
  cd "${SUBSTRATE_SRC}"
  hack/install-ate-kind.sh \
    --deploy-ate-system \
    --atenet-dataplane=agentgateway \
    --credential-provider='{"name":"k8s.io"}' \
    --rollout-timeout=15m
  hack/install-ate-kind.sh --deploy-demo-egress --rollout-timeout=15m
)

GOBIN="${HOME}/.local/bin"
mkdir -p "${GOBIN}"
(
  cd "${SUBSTRATE_SRC}"
  GOBIN="${GOBIN}" go install ./cmd/kubectl-ate
)

kubectl --context "${SANDBOXED_CONTEXT}" -n ate-demo-egress patch workerpool egress \
  --type merge -p '{"spec":{"replicas":1}}'

kubectl --context "${SANDBOXED_CONTEXT}" apply -f "${LAB_ROOT}/k8s/attacker-server.yaml"
kubectl --context "${SANDBOXED_CONTEXT}" apply -f "${LAB_ROOT}/k8s/ticket-server.yaml"
kubectl --context "${SANDBOXED_CONTEXT}" apply -f "${LAB_ROOT}/k8s/legit-api.yaml"
docker tag "${IMAGE_REGISTRY}" "${IMAGE_LOCAL}"
load_kind_image "${IMAGE_LOCAL}" "${SANDBOXED_CLUSTER}"
kubectl --context "${SANDBOXED_CONTEXT}" -n lab02-shared delete pod -l app=attacker-server --wait=false || true
kubectl --context "${SANDBOXED_CONTEXT}" -n lab02-shared delete pod -l app=ticket-server --wait=false || true
kubectl --context "${SANDBOXED_CONTEXT}" -n lab02 delete pod -l app=legit-api --wait=false || true

CANARY="$(new_canary)"
printf '%s\n' "${CANARY}" > "${RESULTS_DIR}/sandboxed-canary.txt"
chmod 600 "${RESULTS_DIR}/sandboxed-canary.txt"
kubectl --context "${SANDBOXED_CONTEXT}" -n lab02 delete secret vendor-api-token --ignore-not-found
kubectl --context "${SANDBOXED_CONTEXT}" -n lab02 create secret generic vendor-api-token \
  --from-literal=token="${CANARY}"

kubectl --context "${SANDBOXED_CONTEXT}" -n ate-system create configmap \
  k8s-credential-provider-namespace-policy \
  --from-file="namespace-policy.yaml=${LAB_ROOT}/k8s/namespace-policy.yaml" \
  --dry-run=client -o yaml | kubectl --context "${SANDBOXED_CONTEXT}" apply -f -
kubectl --context "${SANDBOXED_CONTEXT}" -n ate-system rollout restart deploy/k8s-credential-provider
kubectl --context "${SANDBOXED_CONTEXT}" -n ate-system rollout status deploy/k8s-credential-provider --timeout=180s

wait_rollout "${SANDBOXED_CONTEXT}" lab02-shared attacker-server
wait_rollout "${SANDBOXED_CONTEXT}" lab02-shared ticket-server
wait_rollout "${SANDBOXED_CONTEXT}" lab02 legit-api

template="$(mktemp)"
sed "s|IMAGE_DIGEST_REPLACED_BY_SCRIPT|${image_ref}|" \
  "${LAB_ROOT}/k8s/substrate-actor-template.yaml" > "${template}"

kubectl-ate --context "${SANDBOXED_CONTEXT}" create atespace "${ATESPACE}"
kubectl-ate --context "${SANDBOXED_CONTEXT}" create actor-template -f "${template}"
rm -f "${template}"
kubectl-ate --context "${SANDBOXED_CONTEXT}" create actor "${ACTOR_NAME}" -a "${ATESPACE}" --template "${TEMPLATE_NAME}"
kubectl-ate --context "${SANDBOXED_CONTEXT}" create egress-policy "${ACTOR_NAME}" -a "${ATESPACE}" \
  -f "${LAB_ROOT}/k8s/substrate-egress-policy.yaml"
kubectl-ate --context "${SANDBOXED_CONTEXT}" resume actor "${ACTOR_NAME}" -a "${ATESPACE}"
wait_actor_running "clean boot"

echo "Taking known-good tag before any poison"
kubectl-ate --context "${SANDBOXED_CONTEXT}" suspend actor "${ACTOR_NAME}" -a "${ATESPACE}" --mode=sync
kubectl-ate --context "${SANDBOXED_CONTEXT}" create tag "${TAG_NAME}" -a "${ATESPACE}" --actor "${ACTOR_NAME}" --scope atespace
kubectl-ate --context "${SANDBOXED_CONTEXT}" get tag "${TAG_NAME}" -a "${ATESPACE}" -o yaml \
  | tee "${RESULTS_DIR}/known-good-tag.yaml"
kubectl-ate --context "${SANDBOXED_CONTEXT}" resume actor "${ACTOR_NAME}" -a "${ATESPACE}"
wait_actor_running "resume from known-good suspend"

echo "Sandboxed agent is up. Context ${SANDBOXED_CONTEXT}. Tag ${TAG_NAME} is the restore point."
