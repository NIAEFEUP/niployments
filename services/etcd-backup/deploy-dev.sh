#!/bin/bash

# Only deploy etcd-backup for Kind clusters (development)
# RKE2 has native etcd backup via etcd-s3 configuration

SCRIPT_DIR="$(dirname "$0")"
bash "$SCRIPT_DIR/deploy.sh"
