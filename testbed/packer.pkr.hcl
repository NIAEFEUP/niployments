packer {
  required_plugins {
    vagrant = {
      source  = "github.com/hashicorp/vagrant"
      version = "~> 1"
    }
    virtualbox = {
      version = "~> 1"
      source  = "github.com/hashicorp/virtualbox"
    }
  }
}


source "virtualbox-iso" "generated" {
  guest_os_type = "Linux_64"
  iso_url       = "../node/ninux.iso"
  iso_checksum="none" #disable checksum because image is generated
  ssh_username  = "ni"
  ssh_private_key_file = "../node/bootstrap_key"
  cpus = 2
  memory = 2048
  boot_wait     = "60s"
  boot_command = []
  #maximum of one hour until ssh times out (which means packer timeouts after 1 hour)
  ssh_timeout = "1h" 
}


build {
  sources = [
    "virtualbox-iso.generated"
  ]
}