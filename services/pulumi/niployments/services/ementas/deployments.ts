import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { namespace } from "./namespace.js";
import { labels, containerPort } from "./values.js";
import { apps } from "#services/databases/mongodb/index.js";

const config = new pulumi.Config();
const connectionStringSecretName = "nimentas-mongodb-secret";

apps.addUser({
  name: "nimentas",
  db: "nimentas",
  password: config.requireSecret("mongodb/nimentas-password"),
  roles: [
    {
      name: "readWrite",
      db: "nimentas",
    },
  ],
  connectionStringSecretNamespace: namespace.metadata.name,
  connectionStringSecretName,
});

export const website = new k8s.apps.v1.Deployment(
  "ementas-website",
  {
    metadata: {
      name: "ementas-website",
      namespace: namespace.metadata.name,
    },
    spec: {
      replicas: 1,
      selector: {
        matchLabels: labels,
      },
      template: {
        metadata: {
          labels,
        },
        spec: {
          containers: [
            {
              name: "ementas-website-container",
              image: "registry.niaefeup.pt/niaefeup/nimentas-sasup:main",
              imagePullPolicy: "Always",
              resources: {
                limits: {
                  memory: "128Mi",
                  cpu: "500m",
                },
              },
              ports: [
                {
                  containerPort,
                },
              ],
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
          imagePullSecrets: [
            {
              name: "harbor-pull-secret",
            },
          ],
        },
      },
    },
  },
  { dependsOn: [apps] },
);
