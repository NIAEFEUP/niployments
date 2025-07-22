#!/bin/bash

NI_CERT_KEY=$1

NI_CERT_CERT=$2

kubectl apply -f $(dirname $0)/website
kubectl apply -f $(dirname $0)/nitsig
kubectl apply -f $(dirname $0)/plausible

if [[ -z "$NI_CERT_KEY" ]]; then
  echo "NI_CERT_KEY not found... not creating certificates"
  exit 1
fi

if [[ -z "$NI_CERT_CERT" ]]; then
  echo "NI_CERT_CERT not found... not creating certificates"
  exit 1
fi

kubectl delete secret --namespace=ni-website website-cert

kubectl create secret tls website-cert \
  --namespace=ni-website \
  --key=$NI_CERT_KEY \
  --cert=$NI_CERT_CERT \
  --dry-run=client -o yaml |
  kubectl annotate -f - \
    replicator.v1.mittwald.de/replicate-to=tts,nitsig |
  kubectl apply -f -

