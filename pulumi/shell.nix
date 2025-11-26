{pkgs, ...}:

pkgs.mkShellNoCC {
  meta.description = "A shell for development with pulumi";

  packages = with pkgs; [
    kubectl
    # Required by sync-crds.sh
    crd2pulumi
    kubernetes-helm
    yq-go
    # Node.js
    nodejs_24
    corepack_24
  ];
}
