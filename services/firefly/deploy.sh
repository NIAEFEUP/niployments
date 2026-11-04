#!/bin/bash
helm repo add firefly-iii https://firefly-iii.github.io/kubernetes
helm repo update

kubectl apply -f $(dirname $0)/00-namespace.yaml
kubectl apply -f $(dirname $0)/01-secrets.yaml
kubectl apply -f $(dirname $0)/02-certificates.yaml
kubectl apply -f $(dirname $0)/03-ingress-routes.yaml

helm upgrade --install firefly-iii firefly-iii/firefly-iii \
  --version 1.10.2 \
  --namespace firefly \
  -f $(dirname $0)/values.yaml
