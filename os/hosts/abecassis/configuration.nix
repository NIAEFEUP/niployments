{inputs, lib, options, ...}: {
  imports = [
    inputs.disko.nixosModules.disko
    inputs.srvos.nixosModules.server
    inputs.self.nixosModules.roles-cluster
    ./disk-configuration.nix
    ./vm-configuration.nix
  ];

  networking.hostName = "abecassis";
  networking.hostId = "57844236";
  
  boot.loader.efi.canTouchEfiVariables = true;
  boot.loader.systemd-boot.enable = true;
  
  # disko.tests.extraChecks = ''
  #   machine.wait_for_unit("multi-user.target")
  #   machine.shutdown()
  # '';
  
  disko.tests.extraChecks = ''
    driver.machines_qemu.append(machine)
  '';
 
  virtualisation.vmVariantWithDisko = {
    virtualisation.graphics = false;
    virtualisation.restrictNetwork = true;
    
    users.users.ni.openssh.authorizedKeys.keyFiles = [
      ../../dev/ssh-keys/niployments-dev-vm.pub
    ];
    
    virtualisation.qemu.options = [
      "-device vhost-vsock-pci,guest-cid=68"
    ];
    
    virtualisation.vlans = [1];
  };
  
  # This option defines the first version of NixOS you have installed on this particular machine,
  # and is used to maintain compatibility with application data (e.g. databases) created on older NixOS versions.
  #
  # Most users should NEVER change this value after the initial install, for any reason,
  # even if you've upgraded your system to a new NixOS release.
  #
  # This value does NOT affect the Nixpkgs version your packages and OS are pulled from,
  # so changing it will NOT upgrade your system - see https://nixos.org/manual/nixos/stable/#sec-upgrading for how
  # to actually do that.
  #
  # This value being lower than the current NixOS release does NOT mean your system is
  # out of date, out of support, or vulnerable.
  #
  # Do NOT change this value unless you have manually inspected all the changes it would make to your configuration,
  # and migrated your data accordingly.
  #
  # For more information, see `man configuration.nix` or https://nixos.org/manual/nixos/stable/options#opt-system.stateVersion .
  system.stateVersion = "25.11"; # Did you read the comment?
}
