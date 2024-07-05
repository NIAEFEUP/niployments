#!/bin/bash
# IMPORTANT: Deploy the development cluster first!
# Run from the root of the repository

port=27017  # Define the desired port here

mongodb_dir='./services/databases/mongodb'
pods=$(cat $mongodb_dir/mongodb-cluster.yaml | awk '{if ($1 == "members:") print $2}')

kubectl apply -f "https://raw.githubusercontent.com/limwa/mongodb-kubernetes-operator/master/config/crd/bases/mongodbcommunity.mongodb.com_mongodbcommunity.yaml"

helm repo add mongodb https://mongodb.github.io/helm-charts
helm install community-operator mongodb/community-operator --namespace mongodb --create-namespace
helm upgrade --install community-operator mongodb/community-operator \
  --namespace mongodb \
  --create-namespace \
  --values $(dirname $0)/values.yaml

# kubectl apply -f $mongodb_dir/mongodb-cluster.yaml # --namespace mongodb
# sleep 20  # Wait a little bit for first pod to be created

# for i in $(seq 0 $((pods - 1))); do
#   kubectl wait --for=condition=ready=true -n mongodb pods/mongodb-op-$i --timeout=1200s
# done

# kubectl port-forward -n mongodb svc/mongodb-op-svc $port:27017