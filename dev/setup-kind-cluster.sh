#!/bin/sh

KIND_EXECUTABLE=kind
KUBECTL_EXECUTABLE=kubectl

# first check if the kind executable exists

command -v $KIND_EXECUTABLE >/dev/null 2>&1 || { echo >&2 "I require '$KIND_EXECUTABLE' but it's not installed.  Aborting."; exit 1; }
command -v $KUBECTL_EXECUTABLE >/dev/null 2>&1 || { echo >&2 "I require '$KUBECTL_EXECUTABLE' but it's not installed.  Aborting."; exit 1; }

# Create "kind" network, deleting any old ones if they exist

KIND_NETWORK_NAME=kind
KIND_CLUSTER_NAME=niployments-test-cluster

# delete old kind cluster if it exists. If it does not exist, this command still works (?) so this is ok to do.
$KIND_EXECUTABLE delete clusters $KIND_CLUSTER_NAME

# Delete any old networks that might be present on the system.
# We redirect all output to /dev/null so we do not clutter the terminal output
docker network rm "$KIND_NETWORK_NAME" 1>/dev/null 2>&1 || true
docker network create "$KIND_NETWORK_NAME" \
  --subnet=172.28.0.0/16 \
  --gateway 172.28.0.1 \
  --opt "com.docker.network.bridge.enable_ip_masquerade"="true" \
  --opt "com.docker.network.driver.mtu"="1500"

# create the kind cluster, deleting any old one that might exist

$KIND_EXECUTABLE create cluster --config "$(dirname "$0")"/test-cluster.kind.yaml

# install MetalLB so services are assigned an IP address on creation.

$KUBECTL_EXECUTABLE apply -f https://github.com/metallb/metallb/raw/main/config/manifests/metallb-native.yaml

$KUBECTL_EXECUTABLE wait --namespace metallb-system \
                --for=condition=ready pod \
                --selector=app=metallb \
                --timeout=120s

echo "\
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: example
  namespace: metallb-system
spec:
  addresses:
  - 172.28.255.200-172.28.255.250
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: empty
  namespace: metallb-system" | \
$KUBECTL_EXECUTABLE apply -f -


$KUBECTL_EXECUTABLE apply -f $(dirname "$0")/../services/storage/longhorn/storageClasses/fakeDevClasses

