import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

const namespace = new k8s.core.v1.Namespace("nfs-provisioner-namespace", {
  metadata: {
    name: "nfs-provisioner",
  },
});

export const chart = new k8s.helm.v4.Chart("nfs-provisioner-chart", {
  chart: "nfs-subdir-external-provisioner",
  namespace: namespace.metadata.name,
  skipAwait: true,
  repositoryOpts: {
    repo: "https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner",
  },
  valueYamlFiles: [
        new pulumi.asset.FileAsset("resources/nfs-provisioner/values.yaml")
  ]
});
