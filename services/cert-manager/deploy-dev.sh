#!/bin/bash

helm repo add jetstack https://charts.jetstack.io
helm repo update

kubectl apply -f $(dirname $0)/00-namespace.yaml

helm upgrade --install -f $(dirname $0)/values.yaml cert-manager jetstack/cert-manager --version v1.14.7 --namespace cert-manager

kubectl apply -f $(dirname $0)/01-cluster-issuer-dev.yaml

