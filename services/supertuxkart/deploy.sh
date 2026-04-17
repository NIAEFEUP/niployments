#!/usr/bin/env bash

kubectl apply -f $(dirname $0)/00-namespace.yaml
kubectl apply -f $(dirname $0)/01-deployment.yaml
