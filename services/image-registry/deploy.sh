#! /bin/bash

helm repo add harbor https://helm.goharbor.io
helm repo update

kubectl apply -f $(dirname $0)/00-harbor-namespace.yaml
helm upgrade --install harbor harbor/harbor \
  --namespace image-registry \
  --values $(dirname $0)/harbor-local-values.yaml


kubectl apply -f $(dirname $0)/keel-local-deployment.yaml
