import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

const namespace = new k8s.core.v1.Namespace("cert-manager-namespace", {
  metadata: {
    name: "cert-manager",
  },
});

export const chart = new k8s.helm.v4.Chart("cert-manager-chart", {
  chart: "cert-manager",
  version: "v1.14.7",
  namespace: namespace.metadata.name,
  skipAwait: true,
  repositoryOpts: {
    repo: "https://charts.jetstack.io",
  },
  valueYamlFiles: [new pulumi.asset.FileAsset("./assets/cert-manager/values.yaml")],
});
