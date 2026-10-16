#!/bin/bash
# Deploy the simple 2048 setup.
# Usage: ./deploy.sh
cd $(dirname $0)

kubectl apply -f 00-namespace.yaml
kubectl apply -f 01-deployment.yaml
kubectl apply -f 02-ingress-route.yaml
