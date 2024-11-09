import * as k8s from "@pulumi/kubernetes";

export const chart = new k8s.helm.v4.Chart("nfs-provisioner-chart", {
  chart: "nfs-subdir-external-provisioner",
  skipAwait: true,
  repositoryOpts: {
    repo: "https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner",
  },
  valueYamlFiles: ["./values.yaml"],
});
