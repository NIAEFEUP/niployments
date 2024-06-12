#!/bin/bash

NI_CERT_KEY=$1



NI_CERT_CERT=$2




kubectl apply -f $(dirname $0)/website
kubectl apply -f $(dirname $0)/nijobs
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

kubectl create secret tls --namespace=nijobs website-cert --key=$NI_CERT_KEY --cert=$NI_CERT_CERT
kubectl create secret tls --namespace=nitsig website-cert --key=$NI_CERT_KEY --cert=$NI_CERT_CERT
kubectl create secret tls --namespace=ni-website website-cert --key=$NI_CERT_KEY --cert=$NI_CERT_CERT