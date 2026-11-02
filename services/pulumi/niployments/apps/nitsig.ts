import { AppNamespace } from "#components/app-namespace.js";
import { TlsIngress } from "#components/tls-ingress.js";
import { WebApp } from "#components/web-app.js";
import { niFeUpPtCertificate } from "#utils/ni-certificate.js";
import { image } from "#utils/registry.js";
import { hostRule, stripPrefix } from "#utils/traefik.js";

const namespace = "nitsig";

/** NITSIG, served from ni.fe.up.pt/nitsig. */
export function nitsig() {
  const ns = new AppNamespace(namespace, { pullSecret: true });

  const app = new WebApp(
    "nitsig-website",
    {
      namespace,
      serviceName: "nitsig-service",
      keel: true,
      pullSecret: true,
      containers: [
        {
          name: "nitsig-website",
          image: image("niaefeup/nitsig-website", "main"),
          imagePullPolicy: "Always",
          resources: { limits: { memory: "64Mi", cpu: "64m" } },
          ports: [{ containerPort: 80 }],
        },
      ],
      targetPort: 80,
      dependsOn: [ns],
    },
    { dependsOn: [ns] },
  );

  const certificate = niFeUpPtCertificate(namespace, [ns]);
  const strip = stripPrefix(namespace, "stripprefix-nitsig", ["/nitsig"], {
    dependsOn: [ns],
  });

  new TlsIngress("nitsig-https", {
    namespace,
    name: "nitsig-https",
    tlsSecretName: "website-cert",
    routes: [
      {
        kind: "Rule",
        match: hostRule(["ni.fe.up.pt"], "/nitsig"),
        services: [app.target],
        middlewares: [{ name: strip.metadata.name }],
      },
    ],
    dependsOn: [certificate],
  });
}
