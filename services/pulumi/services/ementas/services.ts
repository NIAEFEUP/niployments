import * as k8s from "@pulumi/kubernetes";
import { namespace } from "./namespace";
import { containerPort, labels } from "./values";

export const port = 80;

export const service = new k8s.core.v1.Service("ementas-service", {
    metadata: {
        name: "ementas-service",
        namespace: namespace.metadata.name,
    },
    spec: {
        selector: labels,
        ports: [
            {
                port,
                targetPort: containerPort,
            },
        ],
    },
});
