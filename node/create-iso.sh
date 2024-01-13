#!/bin/bash

curl https://download.rockylinux.org/pub/rocky/9/isos/x86_64/Rocky-9.3-x86_64-minimal.iso -C - -o rocky.iso

mkdir -p rocky-iso
cd rocky-iso
bsdtar xf ../rocky.iso
cd ..
cp ks.cfg rocky-iso/isolinux/
cp grub.cfg rocky-iso/EFI/BOOT/grub.cfg
cp ninux-splash.png rocky-iso/isolinux/splash.png
cp isolinux.cfg rocky-iso/isolinux/
cd rocky-iso

mkisofs \
    -o ../ninux.iso \
    -b isolinux.bin \
    -c boot.cat \
    -no-emul-boot -boot-load-size 4 -boot-info-table \
    -V "Rocky-NInux-9" -R -J -v -T isolinux/. .

mkisofs \
   -o ../ninux-efi.iso \
   -R -J -v -d -N \
   -x ../ninux-efi.iso \
   -hide-rr-moved \
   -no-emul-boot \
   -eltorito-platform efi \
   -eltorito-boot images/efiboot.img \
   -V "Rocky-NInux-9" \
   .

cd ..
rm -rf rocky-iso