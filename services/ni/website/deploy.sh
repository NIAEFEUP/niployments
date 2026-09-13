#!/bin/bash

cd $(dirname $0)

kubectl apply -f 00-namespace.yaml
kubectl apply -f 01-deployment.yaml
kubectl apply -f 02-certificates.yaml
kubectl apply -f 03-ingress-routes.yaml
