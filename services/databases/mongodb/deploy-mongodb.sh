#!/bin/bash

# Install CRDs
kubectl apply -f "https://raw.githubusercontent.com/limwa/mongodb-kubernetes-operator/master/config/crd/bases/mongodbcommunity.mongodb.com_mongodbcommunity.yaml"

# Deploy operator
helm repo add mongodb https://mongodb.github.io/helm-charts
helm upgrade --install community-operator mongodb/community-operator \
  --namespace mongodb \
  --create-namespace \
  --values "$(dirname "$0")/values.yaml"
