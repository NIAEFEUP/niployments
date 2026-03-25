#!/bin/bash

set -euo pipefail

OFFICIAL_TAILSCALE_KEY="${1:-}"
HEADSCALE_KEY="${2:-}"

HEADSCALE_URL="${HEADSCALE_URL:-https://headscale.niaefeup.pt}"
RPI_HOSTNAME="${RPI_HOSTNAME:-rpi-gateway}"
WAN_INTERFACE="${WAN_INTERFACE:-eth0}"

OFFICIAL_STATE_DIR="${OFFICIAL_STATE_DIR:-/var/lib/tailscale-official}"
HEADSCALE_STATE_DIR="${HEADSCALE_STATE_DIR:-/var/lib/tailscale-headscale}"

OFFICIAL_SOCKET="${OFFICIAL_SOCKET:-/var/run/tailscale-official.sock}"
HEADSCALE_SOCKET="${HEADSCALE_SOCKET:-/var/run/tailscale-headscale.sock}"

OFFICIAL_PORT="${OFFICIAL_PORT:-41642}"
HEADSCALE_PORT="${HEADSCALE_PORT:-41641}"

OFFICIAL_TUN="${OFFICIAL_TUN:-tailscale1}"
HEADSCALE_TUN="${HEADSCALE_TUN:-tailscale0}"

OFFICIAL_LOG="${OFFICIAL_LOG:-/var/log/tailscale-official.log}"
HEADSCALE_LOG="${HEADSCALE_LOG:-/var/log/tailscale-headscale.log}"

usage() {
  echo "Usage: $0 <OFFICIAL_TAILSCALE_AUTH_KEY> <HEADSCALE_AUTH_KEY>" >&2
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command '$1' was not found" >&2
    exit 1
  fi
}

if [ -z "$OFFICIAL_TAILSCALE_KEY" ] || [ -z "$HEADSCALE_KEY" ]; then
  usage
  exit 1
fi

for cmd in tailscaled tailscale iptables pgrep pkill; do
  require_cmd "$cmd"
done

if [ "$(id -u)" -ne 0 ]; then
  echo "Error: this script must run as root" >&2
  exit 1
fi

mkdir -p "$OFFICIAL_STATE_DIR" "$HEADSCALE_STATE_DIR" /var/run /var/log

stop_instance() {
  local socket="$1"
  local state_dir="$2"
  local port="$3"

  echo "Stopping existing tailscaled instance for socket: $socket"

  pkill -f "tailscaled .*--socket=$socket" >/dev/null 2>&1 || true
  pkill -f "tailscaled .*--state=${state_dir}/tailscaled.state" >/dev/null 2>&1 || true
  pkill -f "tailscaled .*--port=$port" >/dev/null 2>&1 || true

  sleep 1

  if [ -S "$socket" ]; then
    rm -f "$socket"
  fi
}

start_instance() {
  local socket="$1"
  local state_dir="$2"
  local port="$3"
  local tun_dev="$4"
  local log_file="$5"
  local retries="${TAILSCALED_READY_RETRIES:-45}"
  local sleep_seconds="${TAILSCALED_READY_SLEEP_SECONDS:-1}"
  local pid
  local status_json

  echo "Starting tailscaled instance for socket: $socket"

  nohup tailscaled \
    --state="${state_dir}/tailscaled.state" \
    --socket="$socket" \
    --port="$port" \
    --tun="$tun_dev" \
    >"$log_file" 2>&1 &
  pid=$!

  for _ in $(seq 1 "$retries"); do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      echo "Error: tailscaled process exited early for socket $socket" >&2
      echo "Check log: $log_file" >&2
      exit 1
    fi

    status_json="$(tailscale --socket="$socket" status --json 2>/dev/null || true)"
    if [ -n "$status_json" ] && printf '%s' "$status_json" | grep -Eq '"BackendState"\s*:\s*"(NeedsLogin|Running|Starting|Stopped|NeedsMachineAuth)"'; then
      echo "tailscaled ready on socket: $socket"
      return
    fi

    sleep "$sleep_seconds"
  done

  echo "Error: tailscaled failed to become ready for socket $socket" >&2
  echo "Waited $((retries * sleep_seconds))s for local API readiness" >&2
  echo "Check log: $log_file" >&2
  exit 1
}

configure_forwarding() {
  echo "Configuring forwarding and NAT on interface: $WAN_INTERFACE"

  sysctl -w net.ipv4.ip_forward=1 >/dev/null

  if ! iptables -t nat -C POSTROUTING -o "$WAN_INTERFACE" -j MASQUERADE >/dev/null 2>&1; then
    iptables -t nat -A POSTROUTING -o "$WAN_INTERFACE" -j MASQUERADE
  fi
}

login_official_tailnet() {
  echo "Logging in official Tailscale instance"

  tailscale --socket="$OFFICIAL_SOCKET" up \
    --authkey "$OFFICIAL_TAILSCALE_KEY" \
    --hostname "${RPI_HOSTNAME}-official" \
    --advertise-exit-node \
    --accept-routes
}

login_headscale_tailnet() {
  echo "Logging in Headscale instance at: $HEADSCALE_URL"

  tailscale --socket="$HEADSCALE_SOCKET" up \
    --login-server "$HEADSCALE_URL" \
    --authkey "$HEADSCALE_KEY" \
    --hostname "$RPI_HOSTNAME" \
    --advertise-exit-node \
    --advertise-routes 0.0.0.0/0,::/0 \
    --accept-routes
}

print_status() {
  echo ""
  echo "Official instance status ($OFFICIAL_SOCKET):"
  tailscale --socket="$OFFICIAL_SOCKET" status || true

  echo ""
  echo "Headscale instance status ($HEADSCALE_SOCKET):"
  tailscale --socket="$HEADSCALE_SOCKET" status || true
}

echo "Preparing dual tailscaled setup"

stop_instance "$OFFICIAL_SOCKET" "$OFFICIAL_STATE_DIR" "$OFFICIAL_PORT"
stop_instance "$HEADSCALE_SOCKET" "$HEADSCALE_STATE_DIR" "$HEADSCALE_PORT"

start_instance "$OFFICIAL_SOCKET" "$OFFICIAL_STATE_DIR" "$OFFICIAL_PORT" "$OFFICIAL_TUN" "$OFFICIAL_LOG"
start_instance "$HEADSCALE_SOCKET" "$HEADSCALE_STATE_DIR" "$HEADSCALE_PORT" "$HEADSCALE_TUN" "$HEADSCALE_LOG"

configure_forwarding
login_official_tailnet
login_headscale_tailnet
print_status

echo ""
echo "Done: gateway is connected to official tailnet and Headscale."
