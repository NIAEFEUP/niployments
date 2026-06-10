#!/bin/bash

ROOT=$(dirname $0)

kubectl create namespace sso

helm repo add ory https://k8s.ory.sh/helm/charts
helm repo update

helm upgrade --install -f $ROOT/kratos/values.yaml --namespace sso kratos ory/kratos

helm upgrade --install -f $ROOT/hydra/values.yaml --namespace sso hydra ory/hydra

# Wait for the pods to be ready
KRATOS_POD=$(kubectl get pods --no-headers -n sso -o custom-columns=":metadata.name" | grep '^kratos' | head -n 1)
HYDRA_POD=$(kubectl get pods --no-headers -n sso -o custom-columns=":metadata.name" | grep '^hydra' | head -n 1)

kubectl -n sso wait --for=condition=ready pod/$KRATOS_POD
kubectl -n sso wait --for=condition=ready pod/$HYDRA_POD

kubectl -n sso apply -f $ROOT/certificate.yaml
kubectl -n sso apply -f $ROOT/ingress-route.yaml
