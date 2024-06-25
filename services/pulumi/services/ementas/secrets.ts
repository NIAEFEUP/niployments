import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { namespace } from "./namespace";

const config = new pulumi.Config();

export const secrets = new k8s.core.v1.Secret("ementas-secrets", {
    metadata: {
        name: "ementas-secrets",
        namespace: namespace.metadata.name,
    },
    stringData: {
        "DATABASE_URL": config.require("ementas-mongodb-uri"),
    },
});
