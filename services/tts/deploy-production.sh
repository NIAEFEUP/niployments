#!/bin/bash

kubectl apply -f $(dirname $0)/production/00-namespace.yaml
kubectl apply -f $(dirname $0)/production/01-deployment.yaml
kubectl apply -f $(dirname $0)/production/02-certificates.yaml
kubectl apply -f $(dirname $0)/production/03-ingress-routes.yaml
