#!/bin/bash

helm repo add grafana https://grafana.github.io/helm-charts  # Add Grafana Helm chart
helm repo update
kubectl create namespace loki
helm upgrade --install --namespace loki logging grafana/loki -f $(dirname $0)/values.yaml --set loki.auth_enabled=false --set loki.useTestSchema=true  # Install Loki
# TODO: Stop using test schema
# TODO (maybe): Use auth
helm upgrade --install --namespace loki loki-grafana grafana/grafana  # Install Grafana

