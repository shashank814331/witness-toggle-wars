#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"
parse_ops_args "$@"
require_prereg_tag_for_prod

ENV_KEY="$(resolve_env_key)"
echo "=== Create Experiments (env=$APP_ENV, apply=$APPLY) ==="
echo "Required env vars for --apply: FEEDBACK_FLAG_ID, FEEDBACK_VAR_ID, AA_FLAG_ID, AA_VAR_ID, PRIMARY_METRIC_ID, CHALLENGE1_METRIC_ID, GAVE_UP_METRIC_ID, TRANSFER_METRIC_ID, RENDER_ERR_METRIC_ID"

if [[ "$APPLY" == true ]]; then
  if [[ -z "$ENV_KEY" ]]; then
    echo "Missing environment key for $APP_ENV" >&2
    exit 1
  fi
  PAYLOAD_MAIN=$(cat <<JSON
{"feature":${FEEDBACK_FLAG_ID},"name":"witness_feedback_style_${APP_ENV}","hypothesis":"Showing one concrete failing case increases core_set_completed by >=10% relative without lowering transfer_solved.","metrics":[{"metric":${PRIMARY_METRIC_ID},"expected_direction":"increase"},{"metric":${CHALLENGE1_METRIC_ID},"expected_direction":"increase"},{"metric":${GAVE_UP_METRIC_ID},"expected_direction":"decrease"},{"metric":${TRANSFER_METRIC_ID},"expected_direction":"not-decrease"},{"metric":${RENDER_ERR_METRIC_ID},"expected_direction":"not-increase"}],"experiment_rollout":{"enabled":true,"rollout_percentage":100,"feature_state_value":{"type":"string","value":"control"},"multivariate_feature_state_values":[{"multivariate_feature_option":${FEEDBACK_VAR_ID},"percentage_allocation":50}]}}
JSON
)
  printf '%s\n' "$PAYLOAD_MAIN" | npx --no-install flagsmith api "api/v1/environments/${ENV_KEY}/experiments/" --method POST --input -

  PAYLOAD_AA=$(cat <<JSON
{"feature":${AA_FLAG_ID},"name":"witness_aa_canary_${APP_ENV}","hypothesis":"Identical control copy shows no systematic lift (A/A sanity check).","metrics":[{"metric":${PRIMARY_METRIC_ID},"expected_direction":"increase"}],"experiment_rollout":{"enabled":true,"rollout_percentage":100,"feature_state_value":{"type":"string","value":"control"},"multivariate_feature_state_values":[{"multivariate_feature_option":${AA_VAR_ID},"percentage_allocation":50}]}}
JSON
)
  printf '%s\n' "$PAYLOAD_AA" | npx --no-install flagsmith api "api/v1/environments/${ENV_KEY}/experiments/" --method POST --input -
else
  echo "[DRY-RUN] POST api/v1/environments/<${APP_ENV}_key>/experiments/ (witness_feedback_style_${APP_ENV}, 5 metrics, 50/50 split, 100% rollout)"
  echo "[DRY-RUN] POST api/v1/environments/<${APP_ENV}_key>/experiments/ (witness_aa_canary_${APP_ENV}, 1 metric, 50/50 split, 100% rollout)"
fi
