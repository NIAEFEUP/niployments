#!/bin/bash

port=8080

helm repo add grafana https://grafana.github.io/helm-charts  # Add Grafana Helm chart
helm repo update
kubectl create namespace loki
helm upgrade --install --namespace loki logging grafana/loki -f $(dirname $0)/loki-values.yaml --set loki.auth_enabled=false --set loki.useTestSchema=true  # Install Loki
# TODO: Stop using test schema
# TODO (maybe): Use auth
helm upgrade --install --namespace loki loki-grafana grafana/grafana -f $(dirname $0)/grafana-values.yaml  # Install Grafana
sleep 10  # TODO: Wait for pods
export POD_NAME=$(kubectl get pods --namespace loki -l "app.kubernetes.io/name=grafana,app.kubernetes.io/instance=loki-grafana" -o jsonpath="{.items[0].metadata.name}")
kubectl --namespace loki wait --for=condition=ready pods/$POD_NAME --timeout=300s
kubectl --namespace loki port-forward $POD_NAME $port:3000 &

echo "Admin password:" $(kubectl get secret --namespace loki loki-grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo)
