import * as fs from "node:fs";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { storageClasses } from "#config";
import { AppNamespace } from "#components/app-namespace.js";
import { TlsIngress } from "#components/tls-ingress.js";
import { WebApp } from "#components/web-app.js";
import { postgres, rolePassword } from "#databases/postgres/index.js";
import { storage } from "#platform/storage.js";
import { guard } from "#utils/adopt.js";
import { hostRule } from "#utils/traefik.js";

const namespace = "plausible-ni";
const host = "plausible.niaefeup.pt";
const clickhouseConfigDir = "./assets/plausible/clickhouse";

/** Plausible, the analytics of our websites, and the ClickHouse database that stores its events. */
export function plausible() {
  const config = new pulumi.Config();
  const ns = new AppNamespace(namespace, { stateful: true });

  postgres().addRole({
    name: "plausible",
    password: rolePassword("plausible"),
  });

  const events = new k8s.core.v1.PersistentVolumeClaim(
    "plausible-events-db-no-backup",
    {
      metadata: { name: "plausible-events-db-no-backup", namespace },
      spec: {
        storageClassName: storageClasses.localityNoBackupRetain,
        accessModes: ["ReadWriteOnce"],
        resources: { requests: { storage: "15Gi" } },
      },
    },
    {
      dependsOn: [ns, ...storage()],

      ...guard(),
    },
  );

  const secret = new k8s.core.v1.Secret(
    "plausible-secret",
    {
      metadata: { name: "plausible-secret", namespace },
      type: "Opaque",
      stringData: {
        SECRET_KEY_BASE: config.requireSecret("plausible/secret-key-base"),
        SMTP_USER_NAME: config.requireSecret("plausible/smtp-user-name"),
        MAILER_EMAIL: config.requireSecret("plausible/mailer-email"),
        SMTP_USER_PWD: config.requireSecret("plausible/smtp-user-pwd"),
        DATABASE_URL: pulumi.interpolate`postgres://plausible:${rolePassword("plausible")}@${postgres().rwService}/${config.require("plausible/postgres-db")}`,
        TOTP_VAULT_KEY: config.requireSecret("plausible/totp-vault-key"),
      },
    },
    { dependsOn: [ns] },
  );

  const plausibleConfig = new k8s.core.v1.ConfigMap(
    "plausible-config",
    {
      metadata: { name: "plausible-config", namespace },
      data: {
        MAILER_NAME: "Plausible NIAEFEUP",
        DISABLE_REGISTRATION: "invite_only",
        SMTP_HOST_ADDR: "smtp.gmail.com",
        SMTP_HOST_SSL_ENABLED: "true",
        SMTP_HOST_PORT: "465",
        BASE_URL: `https://${host}`,
        CLICKHOUSE_DATABASE_URL:
          "http://plausible-events-db:8123/plausible_events_db",
      },
    },
    { dependsOn: [ns] },
  );

  const clickhouseConfig = new k8s.core.v1.ConfigMap(
    "clickhouse-config",
    {
      metadata: { name: "clickhouse-config", namespace },
      data: Object.fromEntries(
        fs
          .readdirSync(clickhouseConfigDir)
          .map((file) => [
            file,
            fs.readFileSync(`${clickhouseConfigDir}/${file}`, "utf8"),
          ]),
      ),
    },
    { dependsOn: [ns] },
  );

  const clickhouse = new WebApp(
    "clickhouse",
    {
      namespace,
      serviceName: "plausible-events-db",
      port: 8123,
      containers: [
        {
          name: "clickhouse",
          image: "clickhouse/clickhouse-server:24.3.3.102-alpine",
          resources: { limits: { memory: "3072Mi", cpu: "500m" } },
          ports: [{ containerPort: 8123 }],
          volumeMounts: [
            { name: "clickhouse-db", mountPath: "/var/lib/clickhouse" },
            {
              name: "config-volume",
              mountPath: "/etc/clickhouse-server/config.d",
            },
          ],
        },
      ],
      volumes: [
        {
          name: "clickhouse-db",
          persistentVolumeClaim: { claimName: "plausible-events-db-no-backup" },
        },
        { name: "config-volume", configMap: { name: "clickhouse-config" } },
      ],
      targetPort: 8123,
      dependsOn: [ns, events, clickhouseConfig],
    },
    { dependsOn: [ns] },
  );

  const app = new WebApp(
    "plausible",
    {
      namespace,
      serviceName: "plausible",
      containers: [
        {
          name: "plausible",
          image: "ghcr.io/plausible/community-edition:v2.1.0",
          command: [
            "sh",
            "-c",
            "sleep 10 && /entrypoint.sh db createdb && /entrypoint.sh db migrate && /entrypoint.sh run",
          ],
          resources: { limits: { memory: "512Mi", cpu: "256m" } },
          ports: [{ containerPort: 8000 }],
          envFrom: [
            { secretRef: { name: "plausible-secret" } },
            { configMapRef: { name: "plausible-config" } },
          ],
        },
      ],
      targetPort: 8000,
      dependsOn: [ns, secret, plausibleConfig, clickhouse],
    },
    { dependsOn: [ns] },
  );

  new TlsIngress("plausible", {
    namespace,
    name: "website-https",
    certificate: {
      name: "website-cert",
      secretName: "website-cert",
      issuer: "letsencrypt-production",
      commonName: host,
      hosts: [host],
    },
    routes: [{ kind: "Rule", match: hostRule([host]), services: [app.target] }],
  });
}
