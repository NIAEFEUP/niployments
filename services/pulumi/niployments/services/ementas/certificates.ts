import * as crds from "@pulumi/crds";
import { namespace } from "./namespace.js";
import { host } from "./values.js";

export const certificate = new crds.cert_manager.v1.Certificate(
  "ementas-certificate",
  {
    metadata: {
      name: "ementas-certificate",
      namespace: namespace.metadata.name,
    },
    spec: {
      secretName: "ementas-cert",
      issuerRef: {
        name: "letsencrypt-production",
        kind: "ClusterIssuer",
      },
      commonName: host,
      dnsNames: [host],
    },
  },
);
