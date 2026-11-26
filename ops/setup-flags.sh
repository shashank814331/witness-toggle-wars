#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"
parse_ops_args "$@"

ENV_KEY="$(resolve_env_key)"
echo "=== Flagsmith Flags & Warehouse Pre-check (env=$APP_ENV, apply=$APPLY) ==="

if [[ "$APPLY" == true ]]; then
  if [[ -z "$ENV_KEY" ]]; then
    echo "Missing environment key (FLAGSMITH_DEV_ENV_KEY or FLAGSMITH_PROD_ENV_KEY)." >&2
    exit 1
  fi
  WAREHOUSE_JSON="$(npx --no-install flagsmith api "api/v1/environments/${ENV_KEY}/warehouse-connections/")"
  if [[ "$WAREHOUSE_JSON" == "[]" || -z "$WAREHOUSE_JSON" ]]; then
    echo "STOP: warehouse-connections/ returned empty for env=$APP_ENV. Enable Experimentation/Warehouse first." >&2
    exit 1
  fi
fi

run_cmd npx --no-install flagsmith feature create feedback_style --value control --enabled
run_cmd npx --no-install flagsmith feature variant add feedback_style --value counterexample --key counterexample --weight 0
run_cmd npx --no-install flagsmith feature get feedback_style --json

run_cmd npx --no-install flagsmith feature create aa_canary --value control --enabled
run_cmd npx --no-install flagsmith feature variant add aa_canary --value control_copy --key aa_b --weight 0
run_cmd npx --no-install flagsmith feature get aa_canary --json
