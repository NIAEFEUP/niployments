#!/bin/bash

kubectl apply -f "$(dirname "$0")"

helm repo add jetstack https://charts.jetstack.io --force-update

helm upgrade --install trust-manager jetstack/trust-manager \
	--namespace trust-manager \
	--wait
# --set app.webhook.tls.approverPolicy.enabled=true \
# --set app.webhook.tls.approverPolicy.certManagerNamespace=cert-manager
