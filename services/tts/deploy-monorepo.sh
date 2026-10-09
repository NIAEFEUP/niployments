#!/bin/bash

kubectl apply -f $(dirname $0)/beta/00-namespace.yaml
kubectl apply -f $(dirname $0)/beta/01-deployment.yaml
kubectl apply -f $(dirname $0)/beta/02-certificates.yaml
kubectl apply -f $(dirname $0)/beta/03-ingress-routes.yaml
