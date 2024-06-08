#!/bin/bash

helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
kubectl create namespace loki
helm upgrade --install --namespace loki logging grafana/loki -f $(dirname $0)/values.yaml --set loki.auth_enabled=false --set loki.useTestSchema=true
# TODO: Stop using test schema
# TODO (maybe): Use auth
