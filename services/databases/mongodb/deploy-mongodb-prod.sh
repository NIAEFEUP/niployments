#!/bin/bash
# IMPORTANT: Deploy the development cluster first!
# Run from the root of the repository

pods=$(cat $(dirname $0)/mongodb-cluster.yaml | awk '{if ($1 == "members:") print $2}')

helm repo add mongodb https://mongodb.github.io/helm-charts
helm install community-operator mongodb/community-operator --namespace mongodb --create-namespace
kubectl apply -f $(dirname $0)/mongodb-cluster.yaml --namespace mongodb
sleep 20  # Wait a little bit for first pod to be created

for i in $(seq 0 $((pods - 1))); do
  kubectl wait --for=condition=ready=true -n mongodb pods/mongodb-op-$i --timeout=1200s
done
