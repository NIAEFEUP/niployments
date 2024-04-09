#!/bin/sh

KIND_EXECUTABLE=kind
KUBECTL_EXECUTABLE=kubectl
CILIUM_EXECUTABLE=cilium-cli
HELM_EXECUTABLE=helm

# first check if the kind executable exists

command -v $KIND_EXECUTABLE >/dev/null 2>&1 || { echo >&2 "I require '$KIND_EXECUTABLE' but it's not installed.  Aborting."; exit 1; }
command -v $KUBECTL_EXECUTABLE >/dev/null 2>&1 || { echo >&2 "I require '$KUBECTL_EXECUTABLE' but it's not installed.  Aborting."; exit 1; }
command -v $CILIUM_EXECUTABLE >/dev/null 2>&1 || { echo >&2 "I require '$CILIUM_EXECUTABLE' but it's not installed.  Aborting."; exit 1; }
command -v $HELM_EXECUTABLE >/dev/null 2>&1 || { echo >&2 "I require '$CILIUM_EXECUTABLE' but it's not installed.  Aborting."; exit 1; }

# Create "kind" network, deleting any old ones if they exist

KIND_NETWORK_NAME=kind
KIND_CLUSTER_NAME=niployments-test-cluster

# delete old kind cluster if it exists. If it does not exist, this command still works (?) so this is ok to do.
$KIND_EXECUTABLE delete clusters $KIND_CLUSTER_NAME

# Delete any old networks that might be present on the system.
# We redirect all output to /dev/null so we do not clutter the terminal output
docker network rm "$KIND_NETWORK" 1>/dev/null 2>&1 || true
docker network create "$KIND_NETWORK_NAME" \
  --subnet=172.28.0.0/16 \
  --gateway 172.28.0.1 \
  --opt "com.docker.network.bridge.enable_ip_masquerade"="true" \
  --opt "com.docker.network.driver.mtu"="1500"

# create the kind cluster, deleting any old one that might exist

$KIND_EXECUTABLE create cluster --config "$(dirname "$0")"/test-cluster.kind.yaml

# deploy cilium

$HELM_EXECUTABLE repo add cilium https://helm.cilium.io
$HELM_EXECUTABLE repo update
$HELM_EXECUTABLE upgrade --install cilium cilium/cilium \
  --version 1.15.3\
  --namespace kube-system\
  --values $(dirname $0)/../services/cilium/values.yaml\
  --set k8sServiceHost=niployments-test-cluster-external-load-balancer\
  --set k8sServicePort=6443\
  --set bgpControlPlane.enabled=false\
  --set l2announcements.enabled=true\
  --set ipam.mode=kubernetes\
  --set ipv4NativeRoutingCIDR=172.28.0.0/16\
  --set enableIPv4Masquerade=true\
  --set autoDirectNodeRoutes=true\
  --set routingMode=native

$CILIUM_EXECUTABLE status --wait

$KUBECTL_EXECUTABLE apply -f $(dirname $0)/../services/cilium/load-balancer-pool-dev.yaml

cat <<EOF | $KUBECTL_EXECUTABLE apply -f -
apiVersion: "cilium.io/v2alpha1"
kind: CiliumL2AnnouncementPolicy
metadata:
  name: default
spec:
  nodeSelector:
    matchExpressions:
      - key: node-role.kubernetes.io/control-plane
        operator: DoesNotExist
  interfaces:
  - ^eth[0-9]+
  externalIPs: true
  loadBalancerIPs: true
EOF

$HELM_EXECUTABLE upgrade --install traefik traefik/traefik \
  --version 25.0.0 \
  --values $(dirname $0)/../services/traefik/values-dev.yaml \
  --namespace kube-system

$(dirname $0)/../services/cert-manager/deploy-dev.sh