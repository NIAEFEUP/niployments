import { AppNamespace } from "#components/app-namespace.js";
import { TlsIngress } from "#components/tls-ingress.js";
import { WebApp } from "#components/web-app.js";
import { niFeUpPtCertificate } from "#utils/ni-certificate.js";
import { image } from "#utils/registry.js";
import { hostRule } from "#utils/traefik.js";

const namespace = "ni-website";

/** The website of NIAEFEUP, served from niaefeup.pt and (legacy) ni.fe.up.pt. */
export function niWebsite() {
  const ns = new AppNamespace(namespace, { pullSecret: true });

  const app = new WebApp(
    "website-ni",
    {
      namespace,
      keel: true,
      pullSecret: true,
      containers: [
        {
          name: "website-ni",
          image: image("niaefeup/website-niaefeup-frontend", "master"),
          imagePullPolicy: "Always",
          resources: { limits: { memory: "256Mi", cpu: "500m" } },
          ports: [{ containerPort: 80 }],
        },
      ],
      targetPort: 80,
      dependsOn: [ns],
    },
    { dependsOn: [ns] },
  );

  new TlsIngress("website-https", {
    namespace,
    name: "website-https",
    certificate: {
      name: "website-own-cert",
      secretName: "website-own-cert",
      issuer: "letsencrypt-production",
      commonName: "niaefeup.pt",
      hosts: ["niaefeup.pt"],
    },
    routes: [
      {
        kind: "Rule",
        match: hostRule(["niaefeup.pt"]),
        services: [app.target],
      },
    ],
  });

  const legacyCertificate = niFeUpPtCertificate(namespace, [ns]);

  new TlsIngress("website-old-https", {
    namespace,
    name: "website-old-https",
    tlsSecretName: "website-cert",
    routes: [
      {
        kind: "Rule",
        match: hostRule(["ni.fe.up.pt"]),
        services: [app.target],
      },
    ],
    dependsOn: [legacyCertificate],
  });
}
