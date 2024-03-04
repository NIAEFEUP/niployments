#!/bin/bash

set -euo pipefail # if something goes wrong exit immediately

if ! command -v docker &> /dev/null
then
    echo "In order to run this script you need to have 'docker' installed on your machine."
    exit 1
fi

curl https://download.rockylinux.org/pub/rocky/9/isos/x86_64/Rocky-9.3-x86_64-minimal.iso -C - -o rocky.iso

rm -rf ninux.iso

docker build . -t ninux-make-iso

docker run --privileged=true -v .:/vol ninux-make-iso mkksiso --add /NInux --ks /vol/ks.cfg /vol/rocky.iso /vol/ninux.iso