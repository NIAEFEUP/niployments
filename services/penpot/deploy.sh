#!/usr/bin/env bash

helm repo add penpot http://helm.penpot.app
helm repo update

kubectl apply -f $(dirname $0)/00-namespace.yaml
kubectl apply -f $(dirname $0)/01-secrets.yaml
kubectl apply -f $(dirname $0)/02-certificates.yaml
kubectl apply -f $(dirname $0)/03-ingress-routes.yaml

helm upgrade --install penpot penpot/penpot --namespace penpot -f $(dirname $0)/values.yaml
