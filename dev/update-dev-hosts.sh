#!/bin/sh

# Map niployments dev hostnames to the traefik LB IP in /etc/hosts.
# Usage: sudo dev/update-dev-hosts.sh [--remove]

set -e
[ "$(id -u)" -eq 0 ] || { echo "Re-run with sudo." >&2; exit 1; }

HOSTS_FILE=/etc/hosts
IP=172.28.255.205
HOSTS="registry.niployments.local harbor.niployments.local"
MARKER="# >>> niployments-dev >>>"
END="# <<< niployments-dev <<<"

sed "/$MARKER/,/$END/d" "$HOSTS_FILE" > "$HOSTS_FILE.new" && mv "$HOSTS_FILE.new" "$HOSTS_FILE"

if [ "${1:-}" = "--remove" ]; then
  echo "Removed niployments dev entries"
  exit 0
fi

{
  echo "$MARKER"
  for h in $HOSTS; do echo "$IP	$h"; done
  echo "$END"
} >> "$HOSTS_FILE"

echo "Updated $HOSTS_FILE -> $IP"
