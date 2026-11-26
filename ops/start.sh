#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"
parse_ops_args "$@"
require_prereg_tag_for_prod

ENV_KEY="$(resolve_env_key)"
EXP_ID="${EXPERIMENT_ID:-<EXPERIMENT_ID>}"
echo "=== Start Experiment (env=$APP_ENV, id=$EXP_ID, apply=$APPLY) ==="

if [[ "$APPLY" == true ]]; then
  if [[ -z "$ENV_KEY" || -z "${EXPERIMENT_ID:-}" ]]; then
    echo "Provide environment key and EXPERIMENT_ID env var." >&2
    exit 1
  fi
  npx --no-install flagsmith api "api/v1/environments/${ENV_KEY}/experiments/${EXPERIMENT_ID}/start/" --method POST
  npx --no-install flagsmith api "api/v1/environments/${ENV_KEY}/experiments/${EXPERIMENT_ID}/"
else
  echo "[DRY-RUN] POST api/v1/environments/<${APP_ENV}_key>/experiments/${EXP_ID}/start/"
  echo "[DRY-RUN] GET  api/v1/environments/<${APP_ENV}_key>/experiments/${EXP_ID}/ (verify status == running)"
fi
