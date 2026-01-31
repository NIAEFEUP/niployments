{
  description = "A basic flake for development with Nix and NixOS";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    utils.url = "github:limwa/nix-flake-utils";

    # Needed for shell.nix
    flake-compat.url = "github:edolstra/flake-compat";
  };

  outputs = {
    self,
    nixpkgs,
    utils,
    ...
  }@inputs:
    utils.lib.mkFlakeWith {
      forEachSystem = system: {
        outputs = utils.lib.forSystem self system;

        pkgs = import nixpkgs {
          inherit system;
        };
      };
    } {
      formatter = {pkgs, ...}: pkgs.alejandra;

      devShells = utils.lib.invokeAttrs {
        default = {outputs, ...}: outputs.devShells.basic;
        
        # Node.js development shell for the CLI
        niploy = {pkgs, ...}:
          pkgs.mkShell {
            meta.description = "A shell for development in the CLI";
            
            packages = with pkgs; [
              nodejs_24
              corepack_24
              (pkgs.writeShellApplication {
                name = "nx";
                text = ''
                  pnpm exec nx "$@"
                '';
              })
              (pkgs.writeShellApplication {
                name = "niploy";
                text = ''
                  node --run start -- "$@"
                '';
              })
            ];
          };
        
        # k8s development shell with k3d
        k3d = {pkgs, ...}:
          pkgs.mkShellNoCC {
            meta.description = "A shell for development with k3d";
          
            packages = with pkgs; [
              k3d
              kubectl
              kubernetes-helm
            ];
          };

        # k8s development shell for pulumi
        pulumi = {pkgs, ...}:
          pkgs.mkShellNoCC {
            meta.description = "A shell for development with pulumi";
          
            packages = with pkgs; [
              kubectl
              pulumi-bin
              # Required by sync-crds.sh
              crd2pulumi
              kubernetes-helm
              yq-go
              # Node.js
              nodejs_24
              corepack_24
            ];
          };

      };
    };
}
