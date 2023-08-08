CLUSTER_VM_RAM = 4098
NUM_OF_NODES = 4
ip = 2 # start with 2 because virtualbox adapter makes 10.10.0.1 reserved for the host 

Vagrant.configure("2") do |config|

    config.vm.define "router" do |router|
        router.vm.box = "generic/debian11"
        router.vm.network "public_network"
        router.vm.network "private_network", ip:"10.10.0." + ip.to_s, 
            virtualbox__intnet: "clusterNetwork"
        router.vm.provider "virtualbox" do |v|
            v.memory = 512
        end
        router.vm.provision "shell", reboot: true, inline: <<-ROUTERSCRIPT
        echo "net.ipv4.ip_forward = 1" > /etc/sysctl.d/10-router.conf

        echo '
        allow-hotplug eth0
        auto lo
        iface lo inet loopback
        auto eth1
        iface eth0 inet dhcp
            post-up ip route del default dev $IFACE || true

        auto eth1
        iface eth1 inet dhcp

        auto eth2
        iface eth2 inet static
            address 10.10.0.2
            netmask 255.255.255.0
        ' > /etc/network/interfaces

        nft add table nat
        nft add chain nat postrouting { type nat hook postrouting priority 100 \\; }
        nft add rule nat postrouting ip saddr 10.10.0.0/24 oif eth1 masquerade
        nft list ruleset > /etc/nftables.conf
        systemctl enable nftables
        ROUTERSCRIPT
        
        ip = ip + 1 

    end
    for i in 1..NUM_OF_NODES do 
        config.vm.define "cluster#{i}" do |clustervm|
            clustervm.vm.box = "generic/ubuntu2204" 
            clustervm.vm.provider "virtualbox" do |v|
                v.memory = CLUSTER_VM_RAM
            end
            clustervm.vm.network "private_network", ip:"10.10.0." + ip.to_s,
                virtualbox__intnet: "clusterNetwork",
                auto_config: false
            clustervm.vm.provision "shell", inline: <<-SCRIPT
            echo '
            network:
                ethernets:
                    eth0: 
                        dhcp4: true
                        dhcp4-overrides:
                            use-dns: false
                            use-routes: false 
            ' > /etc/netplan/01-netcfg.yaml
            echo '
            network:
                ethernets:
                    eth1:
                        dhcp4: false
                        addresses: [10.10.0.#{ip}/24]
                        routes:
                            -   to: default
                                via: 10.10.0.2 
                                metric: 0
                        nameservers:
                            addresses: [1.1.1.1, 1.0.0.1]
                version: 2
            ' > /etc/netplan/50-privatenetwork.yaml
            netplan apply
            SCRIPT
            ip = ip + 1 
            

        end
    end

end