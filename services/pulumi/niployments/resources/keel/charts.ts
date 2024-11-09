import * as k8s from "@pulumi/kubernetes";

export const chart = new k8s.helm.v4.Chart("keel-chart", {
  chart: "keel",
  skipAwait: true,
  repositoryOpts: {
    repo: "https://charts.keel.sh",
  },
  valueYamlFiles: ["./values.yaml"],
});
