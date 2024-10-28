#!/bin/bash
apt-get purge -y ifupdown

echo "net.ipv4.ip_forward = 1" > /etc/sysctl.d/10-router.conf

echo "[Match]
Name=eth0

[Network]
DHCP=yes
DefaultRouteOnDevice=false
" > /etc/systemd/network/01-vagrant.network

if [[ "$2" = "true" ]]; then
echo "Configuring host-only"
echo "[Match]
Name=eth1

[Network]
Address=10.69.0.$1/24
Gateway=10.69.0.1
DefaultRouteOnDevice=true
" > /etc/systemd/network/01-external.network
else 
echo "Public network... fallback to dhcp"
fi
echo "[Match]
Name=*

[Network]
DHCP=yes

[Network]
LinkLocalAddressing=yes
IPv4LLRoute=true" > /etc/systemd/network/99-default-ipv4ll.network

echo "
nameserver 1.1.1.1
" >> /etc/resolvconf/resolv.conf.d/tail

apt-get install -y avahi-daemon avahi-utils avahi-autoipd

sed -i 's/publish-workstation=no/publish-workstation=yes/g' /etc/avahi/avahi-daemon.conf
