import * as k8s from "@pulumi/kubernetes";
import { namespace } from "./namespace";
import { secrets } from "./secrets";
import { labels, containerPort } from "./values";

export const website = new k8s.apps.v1.Deployment("ementas-website", {
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
            name: "ementas-website",
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
                    name: secrets.metadata.name,
                    key: "connectionString.standard",
                    optional: false,
                  },
                },
              }
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
});
