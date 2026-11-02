#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

helm repo add stefanprodan https://stefanprodan.github.io/podinfo
helm repo update stefanprodan

helm upgrade --install podinfo stefanprodan/podinfo \
  --version 6.14.0 \
  --namespace podinfo \
  --create-namespace \
  --values "$SCRIPT_DIR/values.yaml" \
  --wait --timeout 5m