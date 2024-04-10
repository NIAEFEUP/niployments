#!/bin/sh

#TODO(luis): remove static ip configuration when dhcp server can be configured, to better replicate the physical node configuration
# sudo systemctl disable dhcpcd
# sudo systemctl enable --now NetworkManager
sudo ip r del default || true
# sudo nmcli device modify ens5 ipv4.never-default yes
# sudo nmcli con add type ethernet con-name main-network ifname ens6 ip4 10.10.0.$1/24 \
#     gw4 10.10.0.254
# sudo nmcli con up main-network ifname ens6