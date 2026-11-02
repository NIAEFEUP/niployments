import { AppNamespace } from "#components/app-namespace.js";
import { TlsIngress } from "#components/tls-ingress.js";
import { WebApp } from "#components/web-app.js";
import { image } from "#utils/registry.js";
import { hostRule } from "#utils/traefik.js";

const namespace = "website-ae";
const hosts = ["aefeup.pt", "www.aefeup.pt"];

/** The website of AEFEUP. */
export function aefeup() {
  const ns = new AppNamespace(namespace, { pullSecret: true });

  const app = new WebApp(
    "website-ae",
    {
      namespace,
      keel: true,
      pullSecret: true,
      containers: [
        {
          name: "website-ae",
          image: image("niaefeup/website-ae", "main"),
          imagePullPolicy: "Always",
          resources: { limits: { memory: "256Mi", cpu: "500m" } },
          ports: [{ containerPort: 3000 }],
        },
      ],
      targetPort: 3000,
      dependsOn: [ns],
    },
    { dependsOn: [ns] },
  );

  new TlsIngress("website-ae", {
    namespace,
    name: "website-ae-https",
    certificate: {
      name: "website-ae-cert",
      secretName: "website-ae-cert",
      issuer: "letsencrypt-aefeup",
      commonName: "aefeup.pt",
      hosts,
    },
    routes: [{ kind: "Rule", match: hostRule(hosts), services: [app.target] }],
  });
}
