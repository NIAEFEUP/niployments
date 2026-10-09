{ inputs, ... }:

{
  imports = [
    inputs.self.nixosModules.base
    inputs.self.nixosModules.users-ni
  ];
}