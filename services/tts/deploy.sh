#!/bin/bash

# Deploy TTS to Kubernetes cluster
kubectl apply -f $(dirname $0)/production/00-namespace.yaml
kubectl apply -f $(dirname $0)/production/01-deployment.yaml
kubectl apply -f $(dirname $0)/production/02-certificates.yaml
kubectl apply -f $(dirname $0)/production/03-ingress-routes.yaml

# Deploy TTS to staging environment
kubectl apply -f $(dirname $0)/staging/00-namespace.yaml
kubectl apply -f $(dirname $0)/staging/01-deployment.yaml
kubectl apply -f $(dirname $0)/staging/02-certificates.yaml
kubectl apply -f $(dirname $0)/staging/03-ingress-routes.yaml
