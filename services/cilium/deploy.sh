#! /bin/bash

helm repo add cilium https://helm.cilium.io
helm repo update
helm upgrade --install cilium cilium/cilium \
  --version 1.15.3\
  --namespace kube-system\
  --values $(dirname $0)/values.yaml

cilium-cli status --wait

kubectl apply -f $(dirname $0)/bgp-peering-policy.yaml

kubectl apply -f $(dirname $0)/load-balancer-pool.yaml