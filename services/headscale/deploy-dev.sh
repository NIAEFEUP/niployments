#!/bin/bash

set -e

DIR=$(dirname "$0")

kubectl apply -f "$DIR/00-namespace.yaml"
kubectl apply -f "$DIR/01-configuration-dev.yaml"
kubectl apply -f "$DIR/02-volume-claims.yaml"
kubectl apply -f "$DIR/03-service.yaml"
kubectl apply -f "$DIR/04-deployment.yaml"
kubectl delete -f "$DIR/06-ingress-routes.yaml" --ignore-not-found
kubectl delete -f "$DIR/05-certificates.yaml" --ignore-not-found
kubectl apply -f "$DIR/06-ingress-routes-dev.yaml"
