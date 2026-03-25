#!/bin/bash

set -euo pipefail

SCRIPT_DIR=$(dirname "$0")
# shellcheck source=./lib.sh
source "$SCRIPT_DIR/lib.sh"

RPI_USER="${RPI_USER:-subnet-router}"
KEY_EXPIRATION="${KEY_EXPIRATION:-24h}"
REUSABLE="${REUSABLE:-true}"

require_cmd python3
ensure_headscale_ready

user_id="$(create_user_if_missing "$RPI_USER")"
rpi_key="$(create_preauth_key "$user_id" "$KEY_EXPIRATION" "$REUSABLE")"

echo "=============================================="
echo "Headscale RPi user: $RPI_USER"
echo "Headscale RPi user id: $user_id"
echo "RPi Headscale auth key: $rpi_key"
echo "Expires in: $KEY_EXPIRATION"
echo "Reusable: $REUSABLE"
echo "=============================================="
