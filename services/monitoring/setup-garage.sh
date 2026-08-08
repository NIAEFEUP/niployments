#!/bin/bash
set -e

DIR="$(dirname "$0")"

EXTRA_VALUES=""
if [ -f "$DIR/garage-local-values.yaml" ]; then
  EXTRA_VALUES="-f $DIR/garage-local-values.yaml"
  echo "Using local override: garage-local-values.yaml"
fi

if ! helm status garage -n garage &>/dev/null; then
  git clone https://git.deuxfleurs.fr/Deuxfleurs/garage /tmp/garage-repo
  helm install --create-namespace --namespace garage garage /tmp/garage-repo/script/helm/garage -f "$DIR/garage-values.yaml" $EXTRA_VALUES
  rm -rf /tmp/garage-repo
else
  echo "Garage already installed, skipping Helm install."
fi

echo "Waiting for Garage pods to be ready..."
kubectl wait --namespace garage --for=condition=ready pod -l app.kubernetes.io/name=garage --timeout=300s

REPLICAS=$(kubectl get statefulset -n garage garage -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 3)

echo "Waiting for all $REPLICAS Garage nodes to register..."
for i in $(seq 1 30); do
  NODE_COUNT=$(kubectl exec -n garage garage-0 -- ./garage status 2>/dev/null | grep -cP '^\w{16}' || true)
  if [ "$NODE_COUNT" -ge "$REPLICAS" ]; then
    break
  fi
  echo "  Found $NODE_COUNT/$REPLICAS nodes, retrying... ($i/30)"
  sleep 5
done

echo "Fetching Garage node IDs..."
NODE_IDS=$(kubectl exec -n garage garage-0 -- ./garage status 2>/dev/null | grep -oP '^\w{16}' || true)

if [ -n "$NODE_IDS" ]; then
  LAYOUT_CONFIGURED=$(kubectl exec -n garage garage-0 -- ./garage layout show 2>/dev/null | grep -c "dc1" || true)
  if [ "$LAYOUT_CONFIGURED" -eq 0 ]; then
    NODE_ARGS=$(echo "$NODE_IDS" | xargs)
    echo "Assigning layout: $NODE_ARGS"
    kubectl exec -n garage garage-0 -- ./garage layout assign -z dc1 -c 1G $NODE_ARGS
    kubectl exec -n garage garage-0 -- ./garage layout apply --version 1
  else
    echo "Layout already configured, skipping."
  fi
else
  echo "Could not find node IDs. Run the following manually after nodes register:"
  echo "  kubectl exec -n garage garage-0 -- ./garage status"
  echo "  kubectl exec -n garage garage-0 -- ./garage layout assign -z dc1 -c 1G <node-id1> <node-id2> <node-id3>"
  echo "  kubectl exec -n garage garage-0 -- ./garage layout apply --version 1"
fi

echo "Creating Loki chunk bucket..."
kubectl exec -n garage garage-0 -- ./garage bucket create loki-chunks 2>/dev/null || echo "Bucket already exists."

echo "Granting Loki key access to loki-chunks bucket..."
kubectl exec -n garage garage-0 -- ./garage bucket allow loki-chunks --key loki-key --read --write --owner

echo "Creating S3 API key for Loki..."
KEY_OUTPUT=$(kubectl exec -n garage garage-0 -- ./garage key create loki-key)
ACCESS_KEY=$(echo "$KEY_OUTPUT" | grep -i "Key ID" | awk '{print $NF}')
SECRET_KEY=$(echo "$KEY_OUTPUT" | grep -i "Secret key" | awk '{print $NF}')

if [ -z "$ACCESS_KEY" ] || [ -z "$SECRET_KEY" ]; then
  echo "Failed to create API key. Output was:"
  echo "$KEY_OUTPUT"
  exit 1
fi

kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic loki-garage-credentials \
  --namespace monitoring \
  --from-literal=accessKeyId="$ACCESS_KEY" \
  --from-literal=secretAccessKey="$SECRET_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -

echo ""
echo "=== Garage setup complete ==="
echo "Secret 'loki-garage-credentials' created in namespace 'monitoring'"
