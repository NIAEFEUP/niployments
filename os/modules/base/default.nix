{inputs, ...}: {
  imports = [
    inputs.disko.nixosModules.disko
    inputs.srvos.nixosModules.server
  ];
}