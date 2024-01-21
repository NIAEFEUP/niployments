#!/bin/bash

set -euo pipefail # if something goes wrong exit immediately

if ! command -v mkisofs &> /dev/null
then
    echo "In order to run this script you need to have 'mkisofs' installed on your machine."
    exit 1
fi

curl https://download.rockylinux.org/pub/rocky/9/isos/x86_64/Rocky-9.3-x86_64-minimal.iso -C - -o rocky.iso

mkdir -p rocky-iso
(
    cd rocky-iso
    bsdtar xf ../rocky.iso
    cd ..
    cp ks.cfg rocky-iso/isolinux/
    cp ks.cfg rocky-iso/ks-efi.cfg
    cp grub.cfg rocky-iso/EFI/BOOT/grub.cfg
    cp ninux-splash.png rocky-iso/isolinux/splash.png
    cp isolinux.cfg rocky-iso/isolinux/
    cd rocky-iso

    mkisofs \
        -o ../ninux.iso \
        -b isolinux.bin \
        -c boot.cat \
        -no-emul-boot -boot-load-size 4 -boot-info-table \
        -eltorito-alt-boot \
        -eltorito-platform efi \
        -eltorito-boot images/efiboot.img \
        -no-emul-boot \
        -V "Rocky-NInux-9" -R -J -v -T isolinux/. .
)

rm -rf rocky-iso