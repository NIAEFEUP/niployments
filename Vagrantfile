require 'yaml'

config = File.exist?('local-dev-cluster.yaml') ? YAML.load_file('local-dev-cluster.yaml') : YAML.load_file('dev-cluster.yaml')
$cluster_vm_ram = config["cluster"]["node"]["ram"]
num_of_nodes = config["cluster"]["nodeCount"]
$router_ram = config["router"]["ram"]
router_count = config["router"]["count"] || 1 
$bridge_interface = config["networking"] == nil ? nil : config["networking"]["bridgeInterface"]
$host_only = config["networking"] == nil ? false : (config["networking"]["hostOnly"] || false)
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

def configure_router(i, config)
    config.vm.define "router#{i}" do |router|
        router.vm.box = "generic/debian11"
        lip = $ip.clone
        router.vm.provision "shell", reboot: true, path:"dev/router-networking.sh", args: [lip]
        if $host_only == false then
            if $bridge_interface != nil then
                    router.vm.network "public_network",
                    :dev => $bridge_interface
            else
                router.vm.network "public_network"
            end
        else
            router.vm.network "private_network", 
            virtualbox__intnet: "outgoing_network",
            :libvirt__forward_mode => "nat",
            :libvirt__network_name => "outgoing",
            :libvirt__host_ip => "10.69.0.1",
            :ip => "10.69.0."+ (i+1).to_s,
            :libvirt__dhcp_enable => false

            router.vm.provision "shell",
            run: "always",
            inline: "ip r add default via 10.69.0.1" 

            #NOTE (luisd): i think virtualbox doesnt have this problem
            # it mostly applies to wireless configs or  you don't want to
            # expose the router to your network
        end

        configure_ram(router, $router_ram)
        configure_private_network(router, true)
        router.vm.provision "shell" do |s|
            s.inline = "hostnamectl set-hostname $1"
            s.args = ["router"+i.to_s]
        end
    end
end

def configure_cluster_node(i, config)
    config.vm.define "cluster#{i}" do |clustervm|
        clustervm.vm.box = "NIAEFEUP/rocky-NInux"
        clustervm.vm.box_version = "0.4.1"
        lip = $ip.clone
        clustervm.vm.provision "shell" do |s|
            s.path = "dev/node-networking.sh"
            s.args = [lip]
        end

        clustervm.vm.provision "shell" do |s|
            s.inline = "hostnamectl set-hostname $1"
            s.args = ["cluster"+i.to_s]
        end
        configure_ram(clustervm, $cluster_vm_ram)
        configure_private_network(clustervm, false)
        clustervm.ssh.username = "ni"
        clustervm.ssh.private_key_path = "node/bootstrap_key"
                                    
    end
end

Vagrant.configure("2") do |config|
    config.vm.synced_folder '.', '/vagrant', disabled: true
    for i in 1..router_count do
        configure_router(i, config)
    end
    for i in 1..num_of_nodes do 
        configure_cluster_node(i, config)
    end
end
