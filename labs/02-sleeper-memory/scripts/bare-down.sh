#!/usr/bin/env bash
# Delete the bare agent kind cluster.

set -o errexit -o nounset -o pipefail
source "$(dirname "$0")/common.sh"

need kind
kind delete cluster --name "${BARE_CLUSTER}" || true
echo "Bare agent cluster ${BARE_CLUSTER} deleted."
