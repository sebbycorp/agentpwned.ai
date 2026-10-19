#!/usr/bin/env bash
# Score one agent, or compare two JSON scorecards.

set -o errexit -o nounset -o pipefail
source "$(dirname "$0")/common.sh"

need python3
cd "${REPO_ROOT}"

if [[ "${1:-}" == "compare" ]]; then
  shift
  python3 scoring/score_lab01.py --compare "$@"
  exit $?
fi

agent="${1:?usage: score.sh bare|sandboxed|compare file file}"
python3 scoring/score_lab01.py \
  --agent "${agent}" \
  --results-dir "${RESULTS_DIR}" \
  --out "${RESULTS_DIR}/${agent}.json"
