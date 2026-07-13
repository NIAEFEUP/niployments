#! /bin/bash

SCRIPT_DIR=$(dirname $0)
VALUES_FILE=$1

## Workaround for installing longhorn prerequisites on NiNux (We should have these alredy installed in the OS image)
kubectl apply -f https://raw.githubusercontent.com/longhorn/longhorn/v1.6.1/deploy/prerequisite/longhorn-iscsi-selinux-workaround.yaml
kubectl apply -f https://raw.githubusercontent.com/longhorn/longhorn/v1.6.1/deploy/prerequisite/longhorn-iscsi-installation.yaml
kubectl apply -f https://raw.githubusercontent.com/longhorn/longhorn/v1.6.1/deploy/prerequisite/longhorn-nfs-installation.yaml

helm repo add longhorn https://charts.longhorn.io
helm repo update

helm upgrade longhorn longhorn/longhorn \
  --install \
  --namespace longhorn-system \
  --create-namespace \
  --values $VALUES_FILE \
  --version 1.6.1

kubectl apply -f "$(dirname $0)/storageClasses"