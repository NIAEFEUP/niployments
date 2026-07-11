#!/bin/sh

set -e

harbor_credential_path="$1"

function get_docker_credentials() {
    local harbor_credential_path="$1"

    local username="$(yq -r '.name' -oj "$harbor_credential_path")"
    local secret="$(yq -r '.secret' -oj "$harbor_credential_path")"
    echo "$username:$secret"
}

credentials="$(get_docker_credentials "$harbor_credential_path")"
encoded_credentials="$(echo -n "$credentials" | base64)"

auth_settings=$(cat <<EOF
{
    "auths": {
        "registry.niaefeup.pt": {
            "auth": "$encoded_credentials"
        }
    }
}
EOF
)

encoded_auth_settings="$(echo "$auth_settings" | base64 -w 0)"

cat <<EOF
---
kind: Secret
apiVersion: v1
metadata:
  namespace: <FILL-IN>
  name: harbor-pull-secret
  annotations:
    replicator.v1.mittwald.de/replicate-to: "<FILL-IN>"
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: $encoded_auth_settings
EOF
