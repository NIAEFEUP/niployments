#!/bin/bash

set -euo pipefail

SCRIPT_DIR=$(dirname "$0")
# shellcheck source=./lib.sh
source "$SCRIPT_DIR/lib.sh"

KEY_EXPIRATION="${KEY_EXPIRATION:-24h}"
REUSABLE="${REUSABLE:-false}"
LOGIN_SERVER="${LOGIN_SERVER:-https://headscale.niaefeup.pt}"

require_cmd python3
ensure_headscale_ready

read -r -p "Headscale username: " username

if [ -z "$username" ]; then
  echo "Error: username is required" >&2
  exit 1
fi

read -r -p "Key expiration [${KEY_EXPIRATION}]: " expiration_input
if [ -n "$expiration_input" ]; then
  KEY_EXPIRATION="$expiration_input"
fi

read -r -p "Reusable key? (y/N): " reusable_input
if [[ "$reusable_input" =~ ^[Yy]$ ]]; then
  REUSABLE="true"
fi

user_id="$(create_user_if_missing "$username")"
user_key="$(create_preauth_key "$user_id" "$KEY_EXPIRATION" "$REUSABLE")"

echo "=============================================="
echo "Headscale user: $username"
echo "Headscale user id: $user_id"
echo "User auth key: $user_key"
echo "Expires in: $KEY_EXPIRATION"
echo "Reusable: $REUSABLE"
echo
echo "User login command:"
echo "sudo tailscale up --login-server ${LOGIN_SERVER} --authkey ${user_key} --accept-routes"
echo "=============================================="
