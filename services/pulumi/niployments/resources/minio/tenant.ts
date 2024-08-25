/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { minio } from "@pulumi/crds";
import { chart, namespace } from "./charts.js";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";



const config = new pulumi.Config();

export const secret = new k8s.core.v1.Secret("minio-tenant-root-secret", {
    metadata: {
        namespace: namespace.metadata.name,
        name: "minio-tenant-root-secret"
    },
    stringData: {
        "config.env": 
        `
        export MINIO_ROOT_USER=root
        export MINIO_ROOT_PASSWORD=${config.requireSecret("minio/root-secret")}
        `
    }
})


export const minioTenant = new minio.v2.Tenant("minio-tenant", {
    metadata: {
        namespace: namespace.metadata.name,
        name: "minio-tenant"
    },
    spec: {
        pools: [{
            name: "main-pool",
            servers: 1,
            volumesPerServer: 1,
            volumeClaimTemplate: {
                apiVersion: "v1",
                kind: "PersistentVolumeClaim",
                metadata: {
                    namespace: namespace.metadata.name
                },
                spec: {
                    resources: {
                        requests: {
                            storage: "20Gi"
                        }
                    },
                    storageClassName: "longhorn-strict-local-retain",
                    accessModes: ["ReadWriteOnce"]
                }
            }
        }],
        credsSecret: {
            name: secret.metadata.name
        }
    }
}, {dependsOn: [
    chart
]})