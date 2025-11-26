{pkgs, ...}:

pkgs.mkShellNoCC {
  meta.description = "A shell for development with k3d";

  packages = with pkgs; [
    k3d
    kubectl
    kubernetes-helm
  ];
}
