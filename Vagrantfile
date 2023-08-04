CLUSTER_VM_RAM = 4098
NUM_OF_NODES = 3

Vagrant.configure("2") do |config|

    config.vm.define "router" do |router|
        router.vm.box = "generic/freebsd13"
    end
    for i in 1..NUM_OF_NODES do 
        config.vm.define "cluster#{i}" do |cluster1|
            cluster1.vm.box = "generic/ubuntu2204" 
            config.vm.provider "virtualbox" do |v|
                v.memory = CLUSTER_VM_RAM
            end
        end
    end

end