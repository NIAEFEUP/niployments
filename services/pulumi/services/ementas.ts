import * as k8s from "@pulumi/kubernetes";
import * as crds from "#crds";

const namespace = new k8s.core.v1.Namespace("ementas", {
  metadata: {
    name: "ementas",
  },
});

const ingressRoute = new crds.traefik.v1alpha1.IngressRoute("ementas", {
  metadata: {
    namespace: namespace.metadata.name,
  },
  spec: {
    entryPoints: ["web"],
    routes: [
      {
        kind: "Rule",
        match: "Host(`ementas.localhost`)",
        services: [
          {
            name: "ementas",
            port: 80,
          },
        ],
      },
    ],
  },
});


