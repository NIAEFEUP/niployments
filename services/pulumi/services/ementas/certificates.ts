import * as crds from "#crds";
import { namespace } from "./namespace";
import { host } from "./values";

export const certificate = new crds.certmanager.v1.Certificate(
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
