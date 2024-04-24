#!/bin/bash

helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

kubectl apply -f "$(dirname "$0")"/00-namespaces.yaml
kubectl apply -f "$(dirname "$0")"/01-certificates.yaml
kubectl apply -f "$(dirname "$0")"/02-ingress-routes.yaml
kubectl apply -f "$(dirname "$0")"/vault-sa.yaml

helm upgrade --install vault hashicorp/vault --namespace vault --values $(dirname $0)/vault-prod-values.yaml
helm upgrade --install vault-secrets-operator hashicorp/vault-secrets-operator --namespace vault-operator --values $(dirname $0)/vault-operator-prod-values.yaml
