import * as pulumi from "@pulumi/pulumi";
import * as crds from "@pulumi/crds";
import { TTSFrontend } from "../common/frontend.js";
import { TTSBackend } from "../common/backend.js";
import { stripApiPrefix } from "./middleware.js";
import { prefixer } from "./prefixer.js";
import { namespace } from "./namespace.js";

const branch = "develop";
const primaryHost = "tts-staging.niaefeup.pt";

const config = new pulumi.Config("tts-staging");

const frontend = new TTSFrontend(prefixer.create("frontend"), {
  namespace: namespace.metadata.name,
  branch,
});

const frontendService = { name: frontend.name, port: frontend.port };

const backend = new TTSBackend(prefixer.create("backend"), {
  namespace: namespace.metadata.name,
  branch,
  envSecretRef: config.require("envSecretRef"),
});

const backendService = { name: backend.name, port: backend.port };

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
  prefixer.ingressRoute(),
  {
    metadata: {
      namespace: namespace.metadata.name,
    },
    spec: {
      entryPoints: ["websecure"],
      routes: [
        {
          kind: "Rule",
          match: `Host(\`${primaryHost}\`) && PathPrefix(\`/api\`)`,
          services: [backendService],
          middlewares: [stripApiPrefix],
        },
        {
          kind: "Rule",
          match: `Host(\`${primaryHost}\`)`,
          services: [frontendService],
        },
      ],
      tls: {
        secretName: certificateSecretName,
      },
    },
  },
  { dependsOn: [certificate] },
);
