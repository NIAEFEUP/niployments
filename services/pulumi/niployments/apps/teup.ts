import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { storageClasses } from "#config";
import { AppNamespace } from "#components/app-namespace.js";
import { TlsIngress } from "#components/tls-ingress.js";
import { WebApp } from "#components/web-app.js";
import { postgres, rolePassword } from "#databases/postgres/index.js";
import { storage } from "#platform/storage.js";
import { guard } from "#utils/adopt.js";
import { image } from "#utils/registry.js";
import { hostRule } from "#utils/traefik.js";

const namespace = "teup-website";
const hosts = ["teup.pt", "www.teup.pt", "teup.niaefeup.pt"];

/** The website of TEUP. */
export function teup() {
  const config = new pulumi.Config();
  const ns = new AppNamespace(namespace, { stateful: true, pullSecret: true });

  postgres().addRole({ name: "teup", password: rolePassword("teup") });

  const images = new k8s.core.v1.PersistentVolumeClaim(
    "teup-images-pvc",
    {
      metadata: { name: "teup-images-pvc", namespace },
      spec: {
        storageClassName: storageClasses.localityNoBackupRetain,
        accessModes: ["ReadWriteOnce"],
        resources: { requests: { storage: "5Gi" } },
      },
    },
    {
      dependsOn: [ns, ...storage()],

      ...guard(),
    },
  );

  const env = new k8s.core.v1.Secret(
    "teup-website-env",
    {
      metadata: { name: "teup-website-env", namespace },
      type: "Opaque",
      stringData: { env: config.requireSecret("teup/env") },
    },
    { dependsOn: [ns] },
  );

  const limits = { memory: "256Mi", cpu: "500m" };

  const app = new WebApp(
    "teup-website",
    {
      namespace,
      serviceName: "teup-website-service",
      keel: true,
      pullSecret: true,
      strategy: "Recreate",
      containers: [
        {
          name: "teup-website-frontend",
          image: image("teup/website-frontend", "main"),
          imagePullPolicy: "Always",
          resources: { limits },
          ports: [{ containerPort: 80 }],
          volumeMounts: [
            { name: "teup-images", mountPath: "/usr/share/nginx/html/imagens" },
          ],
        },
        {
          name: "teup-website-api",
          image: image("teup/website-api", "master"),
          imagePullPolicy: "Always",
          resources: { limits },
          ports: [{ containerPort: 8000 }],
          volumeMounts: [
            { name: "teup-images", mountPath: "/app/images" },
            {
              name: "teup-env",
              mountPath: "/app/.env",
              subPath: "env",
              readOnly: true,
            },
          ],
        },
      ],
      volumes: [
        {
          name: "teup-images",
          persistentVolumeClaim: { claimName: "teup-images-pvc" },
        },
        { name: "teup-env", secret: { secretName: "teup-website-env" } },
      ],
      targetPort: 80,
      dependsOn: [ns, images, env],
    },
    { dependsOn: [ns] },
  );

  new TlsIngress("teup-website", {
    namespace,
    name: "teup-website-https",
    certificate: {
      name: "teup-website-cert",
      secretName: "teup-website-cert",
      issuer: "letsencrypt-teup",
      commonName: "teup.pt",
      hosts,
    },
    routes: [{ kind: "Rule", match: hostRule(hosts), services: [app.target] }],
  });
}
