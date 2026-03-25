#!/bin/bash
set -e

SCRIPT_DIR=$(dirname "$0")
SIM_DIR="$SCRIPT_DIR/simulator"
LB_HOST="${LB_HOST:-niployments-test-cluster-external-load-balancer}"
HEADSCALE_IP="${HEADSCALE_IP:-172.28.255.205}"

if ! docker network inspect kind >/dev/null 2>&1; then
  echo "Error: docker network 'kind' was not found." >&2
  exit 1
fi

docker compose -f "$SIM_DIR/docker-compose.yaml" down --remove-orphans >/dev/null 2>&1 || true
docker rm -f rpi-simulator >/dev/null 2>&1 || true
docker compose -f "$SIM_DIR/docker-compose.yaml" up -d --build

docker cp ~/.kube/config rpi-simulator:/root/.kube/config
docker exec rpi-simulator sed -i "s@127.0.0.1:[0-9]*@${LB_HOST}:6443@g" /root/.kube/config

docker cp "$SCRIPT_DIR/scripts/10-connect-rpi.sh" rpi-simulator:/opt/headscale/10-connect-rpi.sh
docker exec rpi-simulator chmod +x /opt/headscale/10-connect-rpi.sh

docker exec rpi-simulator sh -c "grep -q 'headscale.niaefeup.pt' /etc/hosts || echo '${HEADSCALE_IP} headscale.niaefeup.pt' >> /etc/hosts"

echo "----------------------------------------------------"
echo "Simulator Ready"
echo "SSH:      ssh root@localhost -p 2222"
echo "Password: raspberry"
echo
echo "Inside simulator, run:"
echo "  /opt/headscale/10-connect-rpi.sh <OFFICIAL_KEY> <HEADSCALE_KEY>"
echo "----------------------------------------------------"
