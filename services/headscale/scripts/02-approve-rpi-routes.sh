#!/bin/bash

set -euo pipefail

SCRIPT_DIR=$(dirname "$0")
# shellcheck source=./lib.sh
source "$SCRIPT_DIR/lib.sh"

RPI_USER="${RPI_USER:-subnet-router}"
ROUTES="${ROUTES:-0.0.0.0/0,::/0}"

require_cmd python3
ensure_headscale_ready

node_ids="$(get_node_ids_for_user "$RPI_USER")"

if [ -z "$node_ids" ]; then
  echo "Error: no nodes found for Headscale user '$RPI_USER'" >&2
  echo "Make sure the RPi connected first using the generated auth key." >&2
  exit 1
fi

echo "Approving routes '$ROUTES' for user '$RPI_USER' nodes..."

while IFS= read -r node_id; do
  [ -z "$node_id" ] && continue
  echo "- approving node id: $node_id"
  headscale nodes approve-routes --identifier "$node_id" --routes "$ROUTES" >/dev/null
done <<< "$node_ids"

echo "Done. Routes approved for all '$RPI_USER' nodes."
