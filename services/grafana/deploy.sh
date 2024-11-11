#!/bin/bash

port=8080

helm repo add grafana https://grafana.github.io/helm-charts  # Add Grafana Helm chart
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts  # Add Prometheus Helm chart
helm repo update

kubectl create namespace monitoring
helm upgrade --install --namespace monitoring loki grafana/loki -f $(dirname $0)/loki-values.yaml --set loki.auth_enabled=false --set loki.schemaConfig=$(dirname $0)/loki-schema.yaml  # Install Loki

helm install kube-prometheus prometheus-community/kube-prometheus-stack --namespace monitoring -f $(dirname $0)/prometheus-config.yaml  # Install Kube Prometheus Stack

sleep 10  # TODO: Wait for pods
POD_NAME=$(kubectl get pods --namespace monitoring -l "app.kubernetes.io/name=grafana" -o jsonpath="{.items[0].metadata.name}")
kubectl --namespace monitoring wait --for=condition=ready pods/$POD_NAME --timeout=1200s
kubectl --namespace monitoring port-forward service/kube-prometheus-grafana $port:80 &
