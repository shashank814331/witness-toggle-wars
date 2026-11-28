#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"
parse_ops_args "$@"

ENV_KEY="$(resolve_env_key)"
echo "=== Create Case-Sensitive Experiment Metrics (env=$APP_ENV, apply=$APPLY) ==="

create_metric() {
  local name="$1"
  local aggregation="$2"
  local direction="$3"
  local payload
  payload=$(cat <<JSON
{"name":"${name}","aggregation":"${aggregation}","direction":"${direction}","definition":{"version":1,"event":"${name}"}}
JSON
)
  if [[ "$APPLY" == true ]]; then
    if [[ -z "$ENV_KEY" ]]; then
      echo "Missing environment key for $APP_ENV" >&2
      exit 1
    fi
    echo "[APPLY] POST api/v1/environments/${ENV_KEY}/experiment-metrics/ -> $payload"
    printf '%s\n' "$payload" | npx --no-install flagsmith api "api/v1/environments/${ENV_KEY}/experiment-metrics/" --method POST --input -
  else
    echo "[DRY-RUN] POST api/v1/environments/<${APP_ENV}_key>/experiment-metrics/ body=$payload"
  fi
}

create_metric "core_set_completed" "occurrence" "up"
create_metric "challenge1_solved" "occurrence" "up"
create_metric "gave_up" "occurrence" "down"
create_metric "transfer_solved" "occurrence" "up"
create_metric "feedback_render_error" "count" "down"
