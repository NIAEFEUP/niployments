packer {
  required_plugins {
    vagrant = {
      source  = "github.com/hashicorp/vagrant"
      version = "~> 1"
    }
  }
}


source "virtualbox-iso" "generated" {
  guest_os_type = "Linux_64"
  iso_url       = "https://channels.nixos.org/nixos-23.05/latest-nixos-minimal-x86_64-linux.iso"
  iso_checksum  = "c92fdd85e18466e4e557d59bed8edfa55f9f139c0b16cf060d59dc198e056e52"
  ssh_username  = "niaefeup"
  ssh_password  = "niaefeup"
  boot_wait     = "60s"
  boot_command = [
    "sudo su<enter><wait>",
    "stop sshd<enter>",
    "mkfs.btrfs -L nixos /dev/sda<enter><wait5>",
    "mount -o discard,compress=lzo LABEL=nixos /mnt<enter><wait>",
    "nixos-generate-config --root /mnt<enter><wait>",
    "nixos-install && reboot<enter>"
  ]
}


build {
  sources = [
    "virtualbox-iso.generated"
  ]
}