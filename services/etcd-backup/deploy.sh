#!/bin/bash
set -e

SCRIPT_DIR="$(dirname "$0")"

echo "Deploying etcd-backup service..."
kubectl apply -f "$SCRIPT_DIR/00-etcd-backup-namespace.yaml"
kubectl apply -f "$SCRIPT_DIR/01-etcd-backup-rbac.yaml"
kubectl apply -f "$SCRIPT_DIR/02-etcd-backup-secret.yaml"
kubectl apply -f "$SCRIPT_DIR/04-etcd-backup-configmap.yaml"
kubectl apply -f "$SCRIPT_DIR/03-etcd-backup-cronjob-kind.yaml"

echo "etcd-backup service deployed successfully"
