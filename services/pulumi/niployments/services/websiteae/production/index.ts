import * as pulumi from "@pulumi/pulumi";
import * as crds from "@pulumi/crds";
import { prefixer } from "./prefixer.js";
import { namespace } from "./namespace.js";
import { WebsiteAE } from "../common/website.js";

const branch = "main";
const primaryHost = "aefeup.pt";

const website = new WebsiteAE(prefixer.create("website-ae"), {
  namespace: namespace.metadata.name,
  branch,
});

const websiteService = { name: website.name, port: website.port };

const certificateSecretName = prefixer.create("certificate-secret");
const certificate = new crds.cert_manager.v1.Certificate(
  prefixer.certificate(),
  {
    metadata: {
      namespace: namespace.metadata.name,
    },
    spec: {
      secretName: certificateSecretName,
      issuerRef: {
        name: "letsencrypt-production",
        kind: "ClusterIssuer",
      },
      dnsNames: [primaryHost],
    },
  },
);

new crds.traefik.v1alpha1.IngressRoute(
  prefixer.chain("primary").ingressRoute(),
  {
    metadata: {
      namespace: namespace.metadata.name,
    },
    spec: {
      entryPoints: ["websecure"],
      routes: [
        {
          kind: "Rule",
          match: `Host(\`${primaryHost}\`)`,
          services: [websiteService],
        },
      ],
      tls: {
        secretName: certificateSecretName,
      },
    },
  },
  { dependsOn: [certificate] },
);


