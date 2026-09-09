#!/bin/bash

kubectl apply -f $(dirname $0)/00-namespace.yaml
kubectl apply -f $(dirname $0)/01-deployment.yaml
kubectl apply -f $(dirname $0)/02-certificate.yaml
kubectl apply -f $(dirname $0)/03-ingress-route.yaml
