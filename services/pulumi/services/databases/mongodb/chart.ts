import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

const chartCrds = new k8s.yaml.v2.ConfigFile("mongodb-community-operator-crds", {
  file: "https://raw.githubusercontent.com/limwa/mongodb-kubernetes-operator/master/config/crd/bases/mongodbcommunity.mongodb.com_mongodbcommunity.yaml",
});

export const chart = new k8s.helm.v4.Chart("mongodb-community-operator-chart", {
  chart: "community-operator",
  namespace: "mongodb",
  valueYamlFiles: [
    new pulumi.asset.FileAsset("./charts/mongodb/values.yaml"),
  ],
  repositoryOpts: {
    repo: "https://mongodb.github.io/helm-charts",
  },
}, { dependsOn: [chartCrds] });
