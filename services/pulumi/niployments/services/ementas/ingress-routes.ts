import * as crds from "@pulumi/crds";
import { certificate } from "./certificates.js";
import { namespace } from "./namespace.js";
import { port as servicePort, service } from "./services.js";
import { host } from "./values.js";

export const ingressRoute = new crds.traefik.v1alpha1.IngressRoute(
  "ementas-ingress-route",
  {
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
          services: [
            {
              name: service.metadata.name,
              port: servicePort,
            },
          ],
        },
      ],
      tls: {
        secretName: "ementas-cert",
      },
    },
  },
  { dependsOn: [certificate] },
);
