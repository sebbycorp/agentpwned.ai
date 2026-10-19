#!/usr/bin/env bash
# Delete the Substrate kind cluster and the local registry the install created.

set -o errexit -o nounset -o pipefail
source "$(dirname "$0")/common.sh"

need kind
need docker
kind delete cluster --name "${SANDBOXED_CLUSTER}" || true
docker rm -f kind-registry >/dev/null 2>&1 || true
echo "Sandboxed agent cluster ${SANDBOXED_CLUSTER} deleted."
