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
            image: "registry.niaefeup.pt/niaefeup/nimentas-sasup:latest",
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
            envFrom: [
              {
                secretRef: {
                  name: secrets.metadata.name,
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
});
