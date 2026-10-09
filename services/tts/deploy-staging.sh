#!/bin/bash

kubectl apply -f $(dirname $0)/staging/00-namespace.yaml
kubectl apply -f $(dirname $0)/staging/01-deployment.yaml
kubectl apply -f $(dirname $0)/staging/02-certificates.yaml
kubectl apply -f $(dirname $0)/staging/03-ingress-routes.yaml
