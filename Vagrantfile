CLUSTER_VM_RAM = 2048
NUM_OF_NODES = 1
ROUTER_RAM = 512
BRIDGE_INTERFACE = nil
HOST_ONLY = true
$ip = 2 # start with 2 because virtualbox adapter makes 10.10.0.1 reserved for the host 

def configure_ram(vm, ram)
    vm.vm.provider "virtualbox" do |v|
        v.memory = ram
    end
    vm.vm.provider :libvirt do |l|
        l.memory = ram
    end
end

def configure_private_network(vm, auto_config)
    vm.vm.network "private_network", 
    ip: "10.10.0." + $ip.to_s,
    virtualbox__intnet: "clusterNetwork",
    :libvirt__dhcp_enabled => false,
    :libvirt__forward_mode => 'none',
    auto_config: auto_config
    $ip = $ip + 1
end

Vagrant.configure("2") do |config|
    config.vm.synced_folder '.', '/vagrant', disabled: true
    config.vm.define "router" do |router|
        router.vm.box = "generic/debian11"
        if HOST_ONLY == false then
            if BRIDGE_INTERFACE != nil then
                    router.vm.network "public_network",
                    :dev => BRIDGE_INTERFACE
            else
                router.vm.network "public_network"
            end
        else
            router.vm.network "private_network", 
            :libvirt__forward_mode => "nat",
            :libvirt__network_name => "outgoing",
            :libvirt__host_ip => "10.69.0.1",
            :ip => "10.69.0.2",
            :libvirt__dhcp_enable => false

            #NOTE (luisd): i think virtualbox doesnt have this problem
            # it mostly applies to wireless configs or  you don't want to
            # expose the router to your network
        end

        configure_ram(router, ROUTER_RAM)
        configure_private_network(router, true)

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
        
    end
    for i in 1..NUM_OF_NODES do 
        config.vm.define "cluster#{i}" do |clustervm|
            clustervm.vm.box = "generic/ubuntu2204" 
            script = <<-SCRIPT
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
                            addresses: [10.10.0.#{$ip}/24]
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
            configure_ram(clustervm, CLUSTER_VM_RAM)
            configure_private_network(clustervm, false)
            clustervm.vm.provision "shell", inline: script
                                            
        end
    end

end