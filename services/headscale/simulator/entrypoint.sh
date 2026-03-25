#!/bin/bash

set -euo pipefail

mkdir -p /var/run/sshd /root/.kube

# Keep startup simple: this simulator is managed through SSH.
exec /usr/sbin/sshd -D -e
