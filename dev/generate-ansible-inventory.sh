#!/bin/bash

PARSED_HOSTS="$(vagrant ssh-config | awk '
    BEGIN { host_section = 0 }
    
    # Function to print Ansible inventory entry
    function print_inventory(host, hostname, username, port, identity_file) {
        print host " ansible_ssh_host=" hostname " ansible_ssh_user=" username " ansible_ssh_port=" port "  ansible_ssh_private_key_file=" identity_file
        print ""
    }
    
    # Detect "Host" section
    /^Host[[:space:]]+/ {
        if (host_section) {
            print_inventory(host, hostname, username, port)
        }
        host_section = 1
        host = $2
    }
    
    # Extract values within sections
    host_section && /^[[:space:]]*HostName[[:space:]]+/ {
        hostname = $2
    }
    host_section && /^[[:space:]]*User[[:space:]]+/ {
        username = $2
    }
    host_section && /^[[:space:]]*Port[[:space:]]+/ {
        port = $2
    }
    
    host_section && /^[[:space:]]*IdentityFile[[:space:]]+/ {
        identity_file = $2
    }
    # End of section
    /^[[:space:]]*$/ {
        if (host_section) {
            print_inventory(host, hostname, username, port, identity_file)
            host_section = 0
            host = ""
            hostname = ""
            username = ""
            port = ""
        }
    }
    
    END {
        if (host_section) {
            print_inventory(host, hostname, username, port, identity_file)
        }
    }
')"
IFS=$'\n' #make ifs new line to array correctly
routers=(`echo "$PARSED_HOSTS" | grep "router"`)
nodes=(`echo "$PARSED_HOSTS" | grep "cluster"`)
IFS=$' '

INVENTORY="[routers]\n"
i=0
for router in "${routers[@]}"
do
    if [ $i -eq 0 ]
    then
        INVENTORY+="$router master=true\n"
    else
        INVENTORY+="$router master=false\n"
    fi
    ((i++))
done

INVENTORY+="\n[controlplane]\n"

i=0
for node in "${nodes[@]}"
do
    if [ $i -eq 3 ]
    then
    INVENTORY+="\n[workers]\n"
    fi
    INVENTORY+="$node\n"
    ((i++))
done
if [ $i -lt 4 ]
then
INVENTORY+="\n[workers]\n"
fi
INVENTORY+="\n[nodes:children]\ncontrolplane\nworkers\n
[all:vars]\ndev_cluster=true\nansible_python_interpreter='/usr/bin/env python3'"

echo -e $INVENTORY > "ansible-inventory-dev.ini"