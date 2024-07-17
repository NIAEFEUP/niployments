import * as k8s from "@pulumi/kubernetes";

export const chart = new k8s.helm.v4.Chart("kubernetes-replicator-chart", {
  chart: "kubernetes-replicator",
  skipAwait: true,
  repositoryOpts: {
    repo: "https://helm.mittwald.de",
  },
});
