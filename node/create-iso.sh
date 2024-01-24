#!/bin/bash

set -euo pipefail # if something goes wrong exit immediately

if ! command -v xorriso &> /dev/null
then
    echo "In order to run this script you need to have 'xorriso' installed on your machine."
    exit 1
fi

curl https://download.rockylinux.org/pub/rocky/9/isos/x86_64/Rocky-9.3-x86_64-minimal.iso -C - -o rocky.iso

rm -rf ninux.iso

xorriso \
    -indev rocky.iso \
    -outdev ninux.iso \
    -boot_image any replay \
    -joliet on \
    -system_id LINUX \
    -compliance joliet_long_names \
    -volid Rocky-NInux-9 \
    -map ks.cfg ks.cfg \
    -map ks.cfg ks-efi.cfg \
    -map grub.cfg  EFI/BOOT/grub.cfg \
    -map ninux-splash.png isolinux/splash.png \
    -map isolinux.cfg isolinux/isolinux.cfg
