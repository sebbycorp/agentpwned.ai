#!/usr/bin/env bash
# Score one phase, or compare JSON scorecards.

set -o errexit -o nounset -o pipefail
source "$(dirname "$0")/common.sh"

need python3
cd "${REPO_ROOT}"

if [[ "${1:-}" == "compare" ]]; then
  shift
  python3 scoring/score_lab02.py --compare "$@"
  exit $?
fi

agent="${1:?usage: score.sh bare|sandboxed|recovered|compare file file [file]}"
python3 scoring/score_lab02.py \
  --agent "${agent}" \
  --results-dir "${RESULTS_DIR}" \
  --out "${RESULTS_DIR}/${agent}.json"
