#!/usr/bin/env bash
# Delete the Arm A kind cluster.

set -o errexit -o nounset -o pipefail
source "$(dirname "$0")/common.sh"

need kind
kind delete cluster --name "${ARM_A_CLUSTER}" || true
echo "Arm A cluster ${ARM_A_CLUSTER} deleted."
