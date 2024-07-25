import * as k8s from "@pulumi/kubernetes";

export const namespace = new k8s.core.v1.Namespace("minio-operator-namespace", {
    metadata: {
        name: "minio-operator"
    }
})

export const chart = new k8s.helm.v4.Chart(
    "minio-operator", 
    {
        chart: "operator",
        namespace: namespace.metadata.name,
        version: "5.0.15",
        repositoryOpts: {
            repo: "https://operator.min.io",
        },
    })
