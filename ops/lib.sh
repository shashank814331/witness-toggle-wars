#!/usr/bin/env bash
set -euo pipefail

APP_ENV="dev"
APPLY=false

parse_ops_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --env)
        APP_ENV="${2:-}"
        shift 2
        ;;
      --apply)
        APPLY=true
        shift
        ;;
      *)
        echo "Unknown argument: $1" >&2
        exit 1
        ;;
    esac
  done

  if [[ "$APP_ENV" != "dev" && "$APP_ENV" != "prod" ]]; then
    echo "Error: --env must be 'dev' or 'prod' (got '$APP_ENV')" >&2
    exit 1
  fi
}

resolve_env_key() {
  if [[ "$APP_ENV" == "dev" ]]; then
    echo "${FLAGSMITH_DEV_ENV_KEY:-}"
  else
    echo "${FLAGSMITH_PROD_ENV_KEY:-}"
  fi
}

run_cmd() {
  if [[ "$APPLY" == true ]]; then
    echo "[APPLY] $*"
    "$@"
  else
    echo "[DRY-RUN] $*"
  fi
}

require_prereg_tag_for_prod() {
  if [[ "$APP_ENV" == "prod" ]]; then
    if ! git rev-parse -q --verify refs/tags/prereg-v1 >/dev/null 2>&1; then
      echo "Refusing Production mutation: git tag 'prereg-v1' must exist before Production start." >&2
      exit 1
    fi
  fi
}
