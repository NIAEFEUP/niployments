#!/bin/sh

cd "$(dirname "$0")"

helm repo add mittwald https://helm.mittwald.de
helm repo update

helm upgrade --install kubernetes-replicator mittwald/kubernetes-replicator
