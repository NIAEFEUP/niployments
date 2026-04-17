{
  description = "A nix flake for local niployments development";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    nixpkgs,
    flake-utils,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {inherit system;};
    in {
      formatter = pkgs.alejandra;

      devShells.default = pkgs.mkShell {
        packages = with pkgs; [
          # Containers / cluster
          docker
          kind
          kubectl
          kubernetes-helm
          kustomize
          cilium-cli

          # Kubernetes UX
          kubectx
          stern
          k9s

          # Ansible
          ansible
          ansible-lint
        ];
      };
    });
}
