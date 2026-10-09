#!/bin/bash

kubectl apply -f $(dirname $0)/monorepo/00-namespace.yaml
kubectl apply -f $(dirname $0)/monorepo/01-deployment.yaml
kubectl apply -f $(dirname $0)/monorepo/02-certificates.yaml
kubectl apply -f $(dirname $0)/monorepo/03-ingress-routes.yaml
