#!/bin/bash

set -euo pipefail

HEADSCALE_NAMESPACE="${HEADSCALE_NAMESPACE:-headscale}"
HEADSCALE_DEPLOYMENT="${HEADSCALE_DEPLOYMENT:-headscale}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command '$1' was not found" >&2
    exit 1
  fi
}

headscale() {
  kubectl exec -n "$HEADSCALE_NAMESPACE" deployment/"$HEADSCALE_DEPLOYMENT" -- headscale "$@"
}

ensure_headscale_ready() {
  require_cmd kubectl
  kubectl wait --for=condition=available --timeout=120s deployment/"$HEADSCALE_DEPLOYMENT" -n "$HEADSCALE_NAMESPACE" >/dev/null
}

get_user_id_by_name() {
  local username="$1"
  headscale users list -o json-line \
    | python3 -c 'import json,sys; raw=sys.stdin.read().strip(); name=sys.argv[1];
if not raw or raw == "null":
    print("")
    raise SystemExit(0)
try:
    data=json.loads(raw)
    users=data if isinstance(data, list) else ([] if data is None else [data])
except json.JSONDecodeError:
    users=[json.loads(line) for line in raw.splitlines() if line.strip() and line.strip() != "null"]
print(next((str(u["id"]) for u in users if isinstance(u, dict) and u.get("name")==name), ""))' "$username"
}

create_user_if_missing() {
  local username="$1"
  local user_id
  user_id="$(get_user_id_by_name "$username")"
  if [ -z "$user_id" ]; then
    headscale users create "$username" >/dev/null
    user_id="$(get_user_id_by_name "$username")"
  fi
  if [ -z "$user_id" ]; then
    echo "Error: failed to resolve user id for '$username'" >&2
    exit 1
  fi
  printf '%s\n' "$user_id"
}

create_preauth_key() {
  local user_id="$1"
  local expiration="$2"
  local reusable_flag="$3"
  local key_json

  if [ "$reusable_flag" = "true" ]; then
    key_json="$(headscale preauthkeys create --user "$user_id" --reusable --expiration "$expiration" -o json-line)"
  else
    key_json="$(headscale preauthkeys create --user "$user_id" --expiration "$expiration" -o json-line)"
  fi

  printf '%s' "$key_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["key"])'
}

get_node_ids_for_user() {
  local username="$1"
  headscale nodes list -o json-line \
    | python3 -c 'import json,sys; raw=sys.stdin.read().strip(); user=sys.argv[1];
if not raw or raw == "null":
    print("")
    raise SystemExit(0)
try:
    data=json.loads(raw)
    nodes=data if isinstance(data, list) else ([] if data is None else [data])
except json.JSONDecodeError:
    nodes=[json.loads(line) for line in raw.splitlines() if line.strip() and line.strip() != "null"]
ids=[str(n["id"]) for n in nodes if isinstance(n, dict) and n.get("user",{}).get("name")==user]
print("\n".join(ids))' "$username"
}
