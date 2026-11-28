#!/bin/bash
# Usage: ./deploy.sh [dev|prod]   (default: prod)
# dev: create the Secret by hand first (kubectl create secret ... --from-file), 01-secret.yaml is skipped.
set -e

DIR=$(dirname $0)
ENV=${1:-prod}

CONTEXT=$(kubectl config current-context)
if [ "$ENV" = prod ] && [[ "$CONTEXT" == kind-* ]]; then
  echo "Refusing to deploy prod config to kind context '$CONTEXT'. Use: $0 dev" >&2
  exit 1
fi

kubectl apply -f $DIR/00-namespace.yaml
if [ "$ENV" = prod ]; then
  kubectl apply -f $DIR/01-secret.yaml
fi
kubectl apply -f $DIR/02-config-$ENV.yaml
kubectl apply -f $DIR/03-deployment.yaml

# ConfigMap changes do not restart pods by themselves
kubectl -n cloudflared rollout restart deployment/cloudflared
