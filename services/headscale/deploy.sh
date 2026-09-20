#!/bin/bash

set -euo pipefail

SCRIPT_DIR=$(dirname "$0")

kubectl create namespace headscale --dry-run=client -o yaml | kubectl apply -f -

helm repo add gabe565 https://charts.gabe565.com
helm repo update

helm upgrade --install headscale gabe565/headscale \
  --namespace headscale \
  --values "$SCRIPT_DIR/values.yaml"

kubectl apply -f "$SCRIPT_DIR/01-certificate.yaml"
kubectl apply -f "$SCRIPT_DIR/02-ingressroute.yaml"
