#!/bin/bash

port=8090
DIR="$(dirname "$0")"

helm repo add grafana https://grafana.github.io/helm-charts  # Add Grafana Helm chart
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts  # Add Prometheus Helm chart
helm repo update

kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

LOKI_EXTRA=""
if [ -f "$DIR/loki-local-values.yaml" ]; then
  LOKI_EXTRA="-f $DIR/loki-local-values.yaml"
  echo "Using local override: loki-local-values.yaml"
fi

LOKI_CREDS=""
if kubectl get secret loki-garage-credentials -n monitoring &>/dev/null; then
  ACCESS_KEY=$(kubectl get secret -n monitoring loki-garage-credentials -o jsonpath='{.data.accessKeyId}' | base64 -d)
  SECRET_KEY=$(kubectl get secret -n monitoring loki-garage-credentials -o jsonpath='{.data.secretAccessKey}' | base64 -d)
  LOKI_CREDS="--set loki.storage.s3.accessKeyId=$ACCESS_KEY --set loki.storage.s3.secretAccessKey=$SECRET_KEY"
fi

helm upgrade --install --namespace monitoring loki grafana/loki -f "$DIR/loki-values.yaml" $LOKI_EXTRA $LOKI_CREDS --set loki.auth_enabled=false  # Install Loki

helm upgrade --install  kube-prometheus prometheus-community/kube-prometheus-stack --namespace monitoring -f $(dirname $0)/prometheus-config.yaml  # Install Kube Prometheus Stack

sleep 10  # TODO: Wait for pods
POD_NAME=$(kubectl get pods --namespace monitoring -l "app.kubernetes.io/name=grafana" -o jsonpath="{.items[0].metadata.name}")
kubectl --namespace monitoring wait --for=condition=ready pods/$POD_NAME --timeout=1200s
kubectl --namespace monitoring port-forward service/kube-prometheus-grafana $port:80 &
