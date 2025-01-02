import * as k8s from "@pulumi/kubernetes";

const namespace = new k8s.core.v1.Namespace("keel-namespace", {
  metadata: {
    name: "keel",
  },
});

export const chart = new k8s.helm.v4.Chart("keel-chart", {
  chart: "keel",
  namespace: namespace.metadata.name,
  skipAwait: true,
  repositoryOpts: {
    repo: "https://charts.keel.sh",
  },
  valueYamlFiles: ["./values.yaml"],
});
