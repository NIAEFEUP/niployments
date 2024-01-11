#!/bin/sh
echo "net.ipv4.ip_forward = 1" > /etc/sysctl.d/10-router.conf

echo "
allow-hotplug eth0
auto lo
iface lo inet loopback
iface eth0 inet dhcp
    post-up ip route del default dev eth0 || true

auto eth2
iface eth2 inet static
    address 10.10.0.$1
    netmask 255.255.255.0
" >> /etc/network/interfaces

nft add table nat
nft add chain nat postrouting { type nat hook postrouting priority 100 \; }
nft add rule nat postrouting ip saddr 10.10.0.0/24 oif eth1 masquerade
nft list ruleset > /etc/nftables.conf
systemctl enable nftables