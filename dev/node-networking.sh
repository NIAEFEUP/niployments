#!/bin/sh
sudo ip r del 0.0.0.0/0 dev ens5
sudo nmcli device modify ens5 ipv4.never-default yes
sudo nmcli con add type ethernet con-name main-network ifname ens6 ip4 10.10.0.$1/24 \
    gw4 10.10.0.254
sudo nmcli con up main-network ifname ens6