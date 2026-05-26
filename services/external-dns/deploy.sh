#!/usr/bin/env bash

helm repo add external-dns https://kubernetes-sigs.github.io/external-dns/
helm repo update

kubectl apply -f $(dirname $0)/00-setup.yaml

helm upgrade --install external-dns external-dns/external-dns \
  --version 1.14.3 \
  --values $(dirname $0)/values.yaml \
  --namespace external-dns
