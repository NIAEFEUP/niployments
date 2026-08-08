#!/bin/bash
set -e

DIR="$(dirname "$0")"

if ! helm status garage -n garage &>/dev/null; then
  git clone https://git.deuxfleurs.fr/Deuxfleurs/garage /tmp/garage-repo
  helm install --create-namespace --namespace garage garage /tmp/garage-repo/script/helm/garage -f "$DIR/garage-values.yaml"
  rm -rf /tmp/garage-repo
else
  echo "Garage already installed, skipping Helm install."
fi

echo "Waiting for Garage pods to be ready..."
kubectl wait --namespace garage --for=condition=ready pod -l app.kubernetes.io/name=garage --timeout=300s

echo "Fetching Garage node IDs..."
NODE_IDS=$(kubectl exec -n garage garage-0 -- ./garage status 2>/dev/null | grep -oP '^\S+' || true)

if [ -n "$NODE_IDS" ]; then
  NODE_ARGS=$(echo "$NODE_IDS" | xargs)
  echo "Assigning layout: $NODE_ARGS"
  kubectl exec -n garage garage-0 -- ./garage layout assign -z dc1 -c 1 $NODE_ARGS
  kubectl exec -n garage garage-0 -- ./garage layout apply --version 1
else
  echo "Could not find node IDs. Run the following manually after nodes register:"
  echo "  kubectl exec -n garage garage-0 -- ./garage status"
  echo "  kubectl exec -n garage garage-0 -- ./garage layout assign -z dc1 -c 1 <node-id1> <node-id2> <node-id3>"
  echo "  kubectl exec -n garage garage-0 -- ./garage layout apply --version 1"
fi

echo "Creating Loki chunk bucket..."
kubectl exec -n garage garage-0 -- ./garage bucket create loki-chunks 2>/dev/null || echo "Bucket already exists."

echo "Creating S3 API key for Loki..."
KEY_OUTPUT=$(kubectl exec -n garage garage-0 -- ./garage key create loki-key)
ACCESS_KEY=$(echo "$KEY_OUTPUT" | grep -i "Key ID" | awk '{print $NF}')
SECRET_KEY=$(echo "$KEY_OUTPUT" | grep -i "Secret key" | awk '{print $NF}')

if [ -z "$ACCESS_KEY" ] || [ -z "$SECRET_KEY" ]; then
  echo "Failed to create API key. Output was:"
  echo "$KEY_OUTPUT"
  exit 1
fi

kubectl create secret generic loki-garage-credentials \
  --namespace monitoring \
  --from-literal=accessKeyId="$ACCESS_KEY" \
  --from-literal=secretAccessKey="$SECRET_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -

echo ""
echo "=== Garage setup complete ==="
echo "Secret 'loki-garage-credentials' created in namespace 'monitoring'"
