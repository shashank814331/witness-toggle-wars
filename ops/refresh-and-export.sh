#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"
parse_ops_args "$@"

ENV_KEY="$(resolve_env_key)"
EXP_ID="${EXPERIMENT_ID:-<EXPERIMENT_ID>}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="evidence/${APP_ENV}"
OUT_FILE="${OUT_DIR}/results-${EXP_ID}-${STAMP}.json"

echo "=== Refresh and Export Experiment Results (env=$APP_ENV, id=$EXP_ID, apply=$APPLY) ==="

if [[ "$APPLY" == true ]]; then
  if [[ -z "$ENV_KEY" || -z "${EXPERIMENT_ID:-}" ]]; then
    echo "Provide environment key and EXPERIMENT_ID env var." >&2
    exit 1
  fi
  mkdir -p "$OUT_DIR"
  npx --no-install flagsmith api "api/v1/environments/${ENV_KEY}/experiments/${EXPERIMENT_ID}/results/refresh/" --method POST
  npx --no-install flagsmith api "api/v1/environments/${ENV_KEY}/experiments/${EXPERIMENT_ID}/results/" > "$OUT_FILE"
  echo "Saved results to $OUT_FILE"
else
  echo "[DRY-RUN] POST api/v1/environments/<${APP_ENV}_key>/experiments/${EXP_ID}/results/refresh/"
  echo "[DRY-RUN] GET  api/v1/environments/<${APP_ENV}_key>/experiments/${EXP_ID}/results/ > $OUT_FILE"
fi
