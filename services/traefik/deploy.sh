#!/bin/bash

helm upgrade --install traefik traefik/traefik \
  --version 25.0.0 \
  --values $(dirname $0)/values.yaml \
  --namespace kube-system