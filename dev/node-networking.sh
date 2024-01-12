#!/bin/sh

echo '
network:
    ethernets:
        eth0: 
            dhcp4: true
            dhcp4-overrides:
                use-dns: false
                use-routes: false 
' > /etc/netplan/01-netcfg.yaml
echo "
    network:
        ethernets:
            eth1:
                dhcp4: false
                addresses: [10.10.0.$1/24]
                routes:
                -   to: default
                    via: 10.10.0.254 
                    metric: 0
                nameservers:
                    addresses: [1.1.1.1, 1.0.0.1]
        version: 2
" > /etc/netplan/50-privatenetwork.yaml
netplan apply