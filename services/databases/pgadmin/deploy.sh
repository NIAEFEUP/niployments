#!/bin/bash

kubectl apply -f $(dirname $0)/00-namespace.yaml
kubectl apply -f $(dirname $0)/01-secrets.yaml
kubectl apply -f $(dirname $0)/02-config.yaml
kubectl apply -f $(dirname $0)/03-deployment.yaml
kubectl apply -f $(dirname $0)/04-certificates.yaml
kubectl apply -f $(dirname $0)/05-ingress-routes.yaml
