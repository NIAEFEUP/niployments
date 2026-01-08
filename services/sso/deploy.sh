#!/bin/bash

ROOT=$(dirname $0)

kubectl create namespace sso

helm repo add ory https://k8s.ory.sh/helm/charts
helm repo update

helm upgrade --install -f $ROOT/values.yaml --namespace sso kratos ory/kratos