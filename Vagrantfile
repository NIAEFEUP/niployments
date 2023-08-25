require 'yaml'

config = YAML.load_file('dev-cluster.yaml')
cluster_vm_ram = config["cluster"]["node"]["ram"]
num_of_nodes = config["cluster"]["nodeCount"]
router_ram = config["router"]["ram"]
bridge_interface = config["networking"] == nil ? nil : config["networking"]["bridgeInterface"]
host_only = config["networking"] == nil ? false : (config["networking"]["hostOnly"] || false)
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
        if host_only == false then
            if bridge_interface != nil then
                    router.vm.network "public_network",
                    :dev => bridge_interface
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

        configure_ram(router, router_ram)
        configure_private_network(router, true)

        router.vm.provision "shell", reboot: true, path:"dev/router-networking.sh"
        
    end
    for i in 1..num_of_nodes do 
        config.vm.define "cluster#{i}" do |clustervm|
            clustervm.vm.box = "generic/ubuntu2204" 
            clustervm.vm.provision "shell" do |s|
                s.path = "dev/node-networking.sh"
                s.args = [$ip]
            end
            configure_ram(clustervm, cluster_vm_ram)
            configure_private_network(clustervm, false)
                                            
        end
    end

end