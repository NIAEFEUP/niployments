#!/bin/sh

# Create RKE2 directory
mkdir -p /etc/rancher/rke2/

# Write RKE2 configuration
echo '
token: niployments-secret
' > /etc/rancher/rke2/config.yaml

# Install RKE2
curl -sfL https://get.rke2.io | sh -
systemctl enable rke2-server.service
systemctl start rke2-server.service

