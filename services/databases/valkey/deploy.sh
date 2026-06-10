#!/bin/bash

SCRIPT_DIR=$(dirname $0)
VALUES_FILE=$1

helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

helm upgrade --install valkey bitnami/valkey \
  --namespace valkey \
  --create-namespace \
  --values $VALUES_FILE


