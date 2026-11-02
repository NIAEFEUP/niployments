#!/bin/bash

helm repo add runix https://helm.runix.net

kubectl apply -f $(dirname $0)/00-namespace.yaml

helm upgrade --install pgadmin4 runix/pgadmin4\
 --version 1.62.0\
 --values $(dirname $0)/values.yaml\
 --namespace pgadmin

kubectl apply -f $(dirname $0)/01-certificates.yaml
kubectl apply -f $(dirname $0)/02-ingress-routes.yaml
