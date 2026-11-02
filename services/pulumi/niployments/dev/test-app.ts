import { AppNamespace } from "#components/app-namespace.js";
import { TlsIngress } from "#components/tls-ingress.js";
import { WebApp } from "#components/web-app.js";
import { hostRule } from "#utils/traefik.js";

const namespace = "test";
const host = "test.niployments.local";

/** A hello-world app to check that ingress and certificates work. */
export function testApp() {
  const ns = new AppNamespace(namespace);

  const app = new WebApp(
    "test-app",
    {
      namespace,
      serviceName: "test-app",
      replicas: 1,
      containers: [
        {
          name: "test-app",
          image: "paulbouwer/hello-kubernetes:1.10",
          ports: [{ containerPort: 8080 }],
        },
      ],
      targetPort: 8080,
      dependsOn: [ns],
    },
    { dependsOn: [ns] },
  );

  new TlsIngress("test", {
    namespace,
    name: "test-https",
    certificate: {
      name: "test-cert",
      secretName: "test-tls",
      issuer: "letsencrypt-production",
      hosts: [host],
    },
    routes: [{ kind: "Rule", match: hostRule([host]), services: [app.target] }],
  });
}
