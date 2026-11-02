#!/usr/bin/env bash
#
# Lists the objects that exist in the cluster of the current kubectl context, in the format
# of `niployments:adopt` (see utils/adopt.ts):
#
#   ./scripts/adopt-inventory.sh > adopt.production.json
#   pulumi config set niployments:adopt adopt.production.json
#
# Only objects declared in the program matter, the others are ignored when adopting.
# Review the output: adopting an object means Pulumi will manage it from now on.

set -euo pipefail

for command in kubectl helm jq; do
  command -v "$command" > /dev/null || { echo "$command is not installed" >&2; exit 1; }
done

kinds=(
  namespaces deployments services configmaps secrets persistentvolumeclaims cronjobs storageclasses
  ingressroutes.traefik.io middlewares.traefik.io
  certificates.cert-manager.io clusterissuers.cert-manager.io
  clusters.postgresql.cnpg.io scheduledbackups.postgresql.cnpg.io
  mongodbcommunity.mongodbcommunity.mongodb.com recurringjobs.longhorn.io
  ciliumloadbalancerippools.cilium.io ciliumbgppeeringpolicies.cilium.io ciliuml2announcementpolicies.cilium.io
)

{
  for kind in "${kinds[@]}"; do
    # kinds whose CRD is not installed (yet) are skipped
    objects=$(kubectl get "$kind" --all-namespaces -o json 2> /dev/null) || continue
    jq -r '.items[] | "\(.kind):\(if .metadata.namespace then .metadata.namespace + "/" else "" end)\(.metadata.name)"' <<< "$objects"
  done

  helm list --all-namespaces -o json | jq -r '.[] | "Release:\(.namespace)/\(.name)"'
} | jq -R . | jq -s 'sort'
