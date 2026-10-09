{
  description = "Description for the project";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    adios-flake.url = "github:Mic92/adios-flake";

    disko.url = "github:nix-community/disko";
    disko.inputs.nixpkgs.follows = "nixpkgs";
    
    srvos.url = "github:nix-community/srvos";
    srvos.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = inputs @ {
    nixpkgs,
    adios-flake,
    self,
    ...
  }:
  # https://github.com/Mic92/adios-flake/blob/main/docs/api-reference.md
    adios-flake.lib.mkFlake {
      inherit inputs self;
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
        "x86_64-darwin"
      ];

      perSystem = {
        pkgs,
        ...
      }: {
        # Per-system attributes can be defined here. The system argument
        # provides the current system string.
        formatter = pkgs.treefmt.withConfig {
          runtimeInputs = [pkgs.alejandra];

          settings = {
            formatter.alejandra = {
              command = "alejandra";
              includes = ["*.nix"];
            };
          };
        };
      };

      flake = { withSystem }: {
        # System-agnostic flake attributes can be defined here,
        # such as nixosModules, overlays, etc.

        nixosModules = {
          roles-cluster = import ./roles/cluster;
          roles-with-router = import ./roles/with-router;
          users-ni = import ./users/ni;
          
          base = import ./modules/base;
          vm = import ./modules/vm;
        };

        nixosConfigurations = let
          mkSystem = {
            system,
            modules ? [],
            specialArgs ? {}
          }:
            nixpkgs.lib.nixosSystem {
              inherit system modules;
              specialArgs = specialArgs // {
                inputs = inputs // {
                  inherit withSystem;
                };
              };
            };
        in
        {
          abecassis = mkSystem {
            system = "x86_64-linux";
            modules = [
              ./hosts/abecassis/configuration.nix
            ];
          };

          bettencourt = mkSystem {
            system = "x86_64-linux";
            modules = [
              ./hosts/bettencourt/configuration.nix
            ];
          };

          casanova = mkSystem {
            system = "x86_64-linux";
            modules = [
              ./hosts/casanova/configuration.nix
            ];
          };

          dupont = mkSystem {
            system = "x86_64-linux";
            modules = [
              ./hosts/dupont/configuration.nix
            ];
          };

          router1 = mkSystem {
            system = "x86_64-linux";
            modules = [
              ./hosts/router1/configuration.nix
            ];
          };

          router2 = mkSystem {
            system = "x86_64-linux";
            modules = [
              ./hosts/router2/configuration.nix
            ];
          };
        };
      };
    };
}
