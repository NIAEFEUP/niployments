#!/bin/bash

ROOT=$(dirname $0)

kubectl create namespace sso

helm repo add ory https://k8s.ory.sh/helm/charts
helm repo update

helm upgrade --install -f $ROOT/kratos/values.yaml --namespace sso kratos ory/kratos

helm upgrade --install -f $ROOT/hydra/values.yaml --namespace sso hydra ory/hydra
