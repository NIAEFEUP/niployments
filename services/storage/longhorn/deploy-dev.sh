#! /bin/bash

SCRIPT_DIR=$(dirname $0)

helm repo add longhorn https://charts.longhorn.io
helm repo update

helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --create-namespace \
  --values $SCRIPT_DIR/dev-values.yaml \
  --version 1.6.1
