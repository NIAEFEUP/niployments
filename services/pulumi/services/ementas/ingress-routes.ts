import * as crds from "#crds";
import { certificate } from "./certificates";
import { namespace } from "./namespace";
import { port as servicePort, service } from "./services";
import { host } from "./values";

export const ingressRoute = new crds.traefik.v1alpha1.IngressRoute("ementas-ingress-route", {
    metadata: {
        name: "website-https",
        namespace: namespace.metadata.name,
    },
    spec: {
        entryPoints: ["websecure"],
        routes: [
            {
                kind: "Rule",
                match: `Host(\`${host}\`)`,
                services: [{
                    name: service.metadata.name,
                    port: servicePort,
                }]
            }
        ],
        tls: {
            secretName: "ementas-cert",
        }
    },
}, { dependsOn: [certificate] });
