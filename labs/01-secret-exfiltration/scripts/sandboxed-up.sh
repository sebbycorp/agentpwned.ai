#!/usr/bin/env bash
# Install Agent Substrate main at SUBSTRATE_REF with agentgateway, then the lab actor.
#
# This follows hack/create-kind-cluster.sh and hack/install-ate-kind.sh.
# The install builds images from the Substrate checkout (Go 1.27 or newer)
# unless ATE_IMAGE_REPO and ATE_IMAGE_TAG point at a published image set.
# Prebuilt ghcr.io images were not anonymously pullable from this lab's
# authoring environment, so the default path is the source install.

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

# create-kind-cluster.sh deletes any existing cluster of this name.
(
  cd "${SUBSTRATE_SRC}"
  hack/create-kind-cluster.sh
)
# Substrate's kind config uses kube-proxy iptables mode. On kernels that
# reject the statistic match, ClusterIP never programs. Fix that before the
# installer waits on Services.
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
image_ref="localhost:5001/lab01-agent@${digest}"
echo "Actor image ${image_ref}"

export KO_DOCKER_REPO="${KO_DOCKER_REPO:-localhost:5001}"
export GOMAXPROCS="${GOMAXPROCS:-2}"

# Main still pins an alpha agentgateway that 403s. Replace both image lines
# with the digest of revision 955d56f before the installer reads them.
pin_agentgateway_image
echo "Atenet dataplane: agentgateway (${AGENTGATEWAY_IMAGE})"

relax_atelet_hostport "${SANDBOXED_CONTEXT}"

(
  cd "${SUBSTRATE_SRC}"
  # --atenet-dataplane selects ingress and egress together. This commit is
  # pre-1.0. v0.5.0's default is envoy and is not a lab path.
  hack/install-ate-kind.sh \
    --deploy-ate-system \
    --atenet-dataplane=agentgateway \
    --credential-provider='{"name":"k8s.io"}' \
    --rollout-timeout=15m
  # The egress demo publishes the gVisor worker image and a WorkerPool
  # labeled workload=egress. The lab actor selects that pool.
  hack/install-ate-kind.sh --deploy-demo-egress --rollout-timeout=15m
)

GOBIN="${HOME}/.local/bin"
mkdir -p "${GOBIN}"
(
  cd "${SUBSTRATE_SRC}"
  GOBIN="${GOBIN}" go install ./cmd/kubectl-ate
)

# One worker is enough for a single lab actor, and it leaves RAM for the
# control plane. The demo manifest ships replicas: 2.
kubectl --context "${SANDBOXED_CONTEXT}" -n ate-demo-egress patch workerpool egress \
  --type merge -p '{"spec":{"replicas":1}}'

kubectl --context "${SANDBOXED_CONTEXT}" apply -f "${LAB_ROOT}/k8s/attacker-server.yaml"
kubectl --context "${SANDBOXED_CONTEXT}" apply -f "${LAB_ROOT}/k8s/legit-api.yaml"
kubectl --context "${SANDBOXED_CONTEXT}" apply -f "${LAB_ROOT}/k8s/dummy.yaml"
load_kind_image "${IMAGE_REGISTRY}" "${SANDBOXED_CLUSTER}"
kubectl --context "${SANDBOXED_CONTEXT}" -n lab01-shared delete pod -l app=attacker-server --wait=false || true
kubectl --context "${SANDBOXED_CONTEXT}" -n lab01 delete pod -l app=legit-api --wait=false || true
kubectl --context "${SANDBOXED_CONTEXT}" -n lab01 delete pod -l app=dummy --wait=false || true

CANARY="$(new_canary)"
printf '%s\n' "${CANARY}" > "${RESULTS_DIR}/sandboxed-canary.txt"
chmod 600 "${RESULTS_DIR}/sandboxed-canary.txt"
kubectl --context "${SANDBOXED_CONTEXT}" -n lab01 delete secret vendor-api-token --ignore-not-found
kubectl --context "${SANDBOXED_CONTEXT}" -n lab01 create secret generic vendor-api-token \
  --from-literal=token="${CANARY}"

kubectl --context "${SANDBOXED_CONTEXT}" -n ate-system create configmap \
  k8s-credential-provider-namespace-policy \
  --from-file="namespace-policy.yaml=${LAB_ROOT}/k8s/namespace-policy.yaml" \
  --dry-run=client -o yaml | kubectl --context "${SANDBOXED_CONTEXT}" apply -f -
kubectl --context "${SANDBOXED_CONTEXT}" -n ate-system rollout restart deploy/k8s-credential-provider
kubectl --context "${SANDBOXED_CONTEXT}" -n ate-system rollout status deploy/k8s-credential-provider --timeout=180s

wait_rollout "${SANDBOXED_CONTEXT}" lab01-shared attacker-server
wait_rollout "${SANDBOXED_CONTEXT}" lab01 legit-api
wait_rollout "${SANDBOXED_CONTEXT}" lab01 dummy

template="$(mktemp)"
sed "s|IMAGE_DIGEST_REPLACED_BY_SCRIPT|${image_ref}|" \
  "${LAB_ROOT}/k8s/substrate-actor-template.yaml" > "${template}"

kubectl-ate --context "${SANDBOXED_CONTEXT}" create atespace lab01
kubectl-ate --context "${SANDBOXED_CONTEXT}" create actor-template -f "${template}"
rm -f "${template}"
kubectl-ate --context "${SANDBOXED_CONTEXT}" create actor exfil-agent -a lab01 --template exfil-agent
kubectl-ate --context "${SANDBOXED_CONTEXT}" create egress-policy exfil-agent -a lab01 \
  -f "${LAB_ROOT}/k8s/substrate-egress-policy.yaml"
kubectl-ate --context "${SANDBOXED_CONTEXT}" resume actor exfil-agent -a lab01

echo "Waiting for the actor to report RUNNING"
for _ in $(seq 1 60); do
  state="$(kubectl-ate --context "${SANDBOXED_CONTEXT}" get actor exfil-agent -a lab01 -o json \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("status",{}).get("state",""))')"
  echo "actor state: ${state}"
  if [[ "${state}" == "ACTOR_STATE_RUNNING" ]]; then
    echo "Sandboxed agent is up. Context ${SANDBOXED_CONTEXT}."
    exit 0
  fi
  sleep 5
done
echo "actor did not reach RUNNING" >&2
kubectl-ate --context "${SANDBOXED_CONTEXT}" get actor exfil-agent -a lab01 -o yaml || true
exit 1
