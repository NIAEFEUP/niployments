import { AppNamespace } from "#components/app-namespace.js";
import { TlsIngress } from "#components/tls-ingress.js";
import { WebApp } from "#components/web-app.js";
import { mongodbApps } from "#databases/mongodb/index.js";
import { image } from "#utils/registry.js";
import { hostRule } from "#utils/traefik.js";
import * as pulumi from "@pulumi/pulumi";

const namespace = "ementas";
const host = "ementas.niaefeup.pt";
const connectionStringSecretName = "nimentas-mongodb-secret";

/** The menus of the canteens of FEUP. */
export function ementas() {
  const config = new pulumi.Config();
  const ns = new AppNamespace(namespace, { pullSecret: true });
  const mongodb = mongodbApps();

  mongodb.addUser({
    name: "nimentas",
    db: "nimentas",
    password: config.requireSecret("mongodb/nimentas-password"),
    roles: [{ name: "readWrite", db: "nimentas" }],
    connectionStringSecretNamespace: namespace,
    connectionStringSecretName,
  });

  const app = new WebApp(
    "ementas-website",
    {
      namespace,
      serviceName: "ementas-service",
      pullSecret: true,
      containers: [
        {
          name: "ementas-website-container",
          image: image("niaefeup/nimentas-sasup", "main"),
          imagePullPolicy: "Always",
          resources: { limits: { memory: "128Mi", cpu: "500m" } },
          ports: [{ containerPort: 3000 }],
          env: [
            {
              name: "DATABASE_URL",
              valueFrom: {
                secretKeyRef: {
                  name: connectionStringSecretName,
                  key: "connectionString.standard",
                },
              },
            },
          ],
        },
      ],
      replicas: 1,
      targetPort: 3000,
      dependsOn: [ns, mongodb],
    },
    { dependsOn: [ns] },
  );

  new TlsIngress("ementas", {
    namespace,
    name: "website-https",
    certificate: {
      name: "ementas-certificate",
      secretName: "ementas-cert",
      issuer: "letsencrypt-production",
      commonName: host,
      hosts: [host],
    },
    routes: [{ kind: "Rule", match: hostRule([host]), services: [app.target] }],
  });
}
