import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { AppNamespace } from "#components/app-namespace.js";
import { TlsIngress } from "#components/tls-ingress.js";
import { WebApp } from "#components/web-app.js";
import { postgres, rolePassword } from "#databases/postgres/index.js";
import { image } from "#utils/registry.js";
import { hostRule, stripPrefix } from "#utils/traefik.js";

type InicioArgs = {
  /** Name of the namespace, of the role and of the config group (`inicio` or `inicio-staging`). */
  namespace: string;
  host: string;
  tag: "main" | "develop";
};

function inicioApp({ namespace, host, tag }: InicioArgs) {
  const config = new pulumi.Config();
  const ns = new AppNamespace(namespace, { pullSecret: true });

  postgres().addRole({ name: namespace, password: rolePassword(namespace) });

  const limits = { memory: "500Mi", cpu: "500m" };

  const frontend = new WebApp(
    "inicio",
    {
      namespace,
      keel: true,
      pullSecret: true,
      containers: [
        {
          name: "inicio",
          image: image("niaefeup/inicio", tag),
          imagePullPolicy: "Always",
          resources: { limits },
          ports: [{ containerPort: 3000 }],
        },
      ],
      targetPort: 3000,
      dependsOn: [ns],
    },
    { dependsOn: [ns] },
  );

  const secret = new k8s.core.v1.Secret(
    `${namespace}-inicio-ws-secret`,
    {
      metadata: { name: "inicio-ws-secret", namespace },
      type: "Opaque",
      stringData: {
        PORT: "1234",
        HOST: "0.0.0.0",
        JWT_SECRET: config.requireSecret(`${namespace}/jwt-secret`),
      },
    },
    { dependsOn: [ns] },
  );

  const ws = new WebApp(
    "inicio-ws",
    {
      namespace,
      keel: true,
      pullSecret: true,
      containers: [
        {
          name: "inicio-ws",
          image: image("niaefeup/inicio-ws", tag),
          imagePullPolicy: "Always",
          resources: { limits },
          ports: [{ containerPort: 1234 }],
          envFrom: [{ secretRef: { name: "inicio-ws-secret" } }],
        },
      ],
      targetPort: 1234,
      dependsOn: [ns, secret],
    },
    { dependsOn: [ns] },
  );

  const strip = stripPrefix(namespace, "strip-ws", ["/ws"], {
    dependsOn: [ns],
  });
  const secretName = `${namespace}-cert`;

  new TlsIngress("inicio", {
    namespace,
    name: `${namespace}-https`,
    certificate: {
      name: secretName,
      secretName,
      issuer: "letsencrypt-production",
      commonName: host,
      hosts: [host],
    },
    routes: [
      {
        kind: "Rule",
        match: hostRule([host], "/ws"),
        services: [ws.target],
        middlewares: [{ name: strip.metadata.name }],
      },
      { kind: "Rule", match: hostRule([host]), services: [frontend.target] },
    ],
  });
}

/** The InÍcio app (production, tracking `main`). */
export const inicio = () =>
  inicioApp({ namespace: "inicio", host: "inicio.niaefeup.pt", tag: "main" });

/** The InÍcio app (staging, tracking `develop`). */
export const inicioStaging = () =>
  inicioApp({
    namespace: "inicio-staging",
    host: "inicio-staging.niaefeup.pt",
    tag: "develop",
  });
