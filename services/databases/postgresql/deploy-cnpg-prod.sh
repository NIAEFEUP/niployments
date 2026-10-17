#!/bin/bash
# IMPORTANT: Deploy the development cluster first!
# Run from the root of the repository

pods=$(cat $(dirname $0)/cnpg-cluster.yaml | awk '{if ($1 == "instances:") print $2}')

# NOTE(luisd): https://cloudnative-pg.io/documentation/1.23/installation_upgrade/#server-side-apply-of-manifests 
#  they recommend force conflicts because such errors might happend when upgrading the controler
kubectl apply --server-side --force-conflicts -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.23/releases/cnpg-1.23.2.yaml
kubectl wait --for=condition=available=true -n cnpg-system deployment/cnpg-controller-manager --timeout=120s

kubectl create namespace pg
kubectl apply -f $(dirname $0)/cnpg-backup-secrets.yaml -n pg
kubectl apply -f $(dirname $0)/cnpg-secrets.yaml -n pg
kubectl apply -f $(dirname $0)/cnpg-cluster.yaml -n pg
sleep 5  # Wait a little bit for first pod to be created
init_pod_1=$(kubectl get pods -n pg | awk '{if ($1 ~ "^cnpg-cluster-1-initdb-*") print $1}')
kubectl wait --for=delete -n pg pods/$init_pod_1 --timeout=300s

for i in $(seq $pods); do
  kubectl wait --for=condition=ready=true -n pg pods/cnpg-cluster-$i --timeout=300s
done
