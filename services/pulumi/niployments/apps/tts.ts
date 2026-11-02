import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as crds from "@pulumi/crds";
import { traefik } from "#platform/traefik.js";
import { AppNamespace } from "#components/app-namespace.js";
import { CronApp } from "#components/cron-app.js";
import { TlsIngress } from "#components/tls-ingress.js";
import { WebApp } from "#components/web-app.js";
import { postgres, rolePassword } from "#databases/postgres/index.js";
import { niFeUpPtCertificate } from "#utils/ni-certificate.js";
import { image } from "#utils/registry.js";
import { hostRule, noopService, stripPrefix } from "#utils/traefik.js";

type TtsArgs = {
  /** Name of the namespace, of the role and of the config group (`tts` or `tts-staging`). */
  namespace: string;
  host: string;
  tag: "main" | "develop";
  /** Also redirect ni.fe.up.pt/tts to the primary address. */
  legacyRedirect?: boolean;
  scrapers: { name: string; schedule: string; make: string }[];
};

const scraperScript = (make: string) => `\
apt update && apt install -y postgresql-client;
psql;
make clean;
${make};
make dump;
make convert_postgres;
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p 5432 -U $POSTGRES_USER -d $POSTGRES_DB -f ./scripts/dump/data/01_data.sql;
`;

/**
 * TTS (the timetable selector): frontend, backend, the scrapers that feed its database
 * and the routes that expose it.
 */
function ttsApp({ namespace, host, tag, legacyRedirect, scrapers }: TtsArgs) {
  const config = new pulumi.Config();
  const ns = new AppNamespace(namespace, { pullSecret: true });

  postgres().addRole({ name: namespace, password: rolePassword(namespace) });

  // PHASE0: use the name of the live env secret of the backend (it was not managed by the old stack)
  const envSecretName = config.get(`${namespace}/env-secret-name`) ?? "tts-env";
  const envSecret = new k8s.core.v1.Secret(
    `${namespace}-env`,
    {
      metadata: { name: envSecretName, namespace },
      type: "Opaque",
      stringData: config.requireSecretObject<Record<string, string>>(
        `${namespace}/env`,
      ),
    },
    { dependsOn: [ns] },
  );

  const limits = { memory: "128Mi", cpu: "500m" };

  const frontend = new WebApp(
    "tts-frontend",
    {
      namespace,
      serviceName: "tts-frontend-service",
      labels: { app: "tts-frontend" },
      keel: true,
      pullSecret: true,
      containers: [
        {
          name: "tts-fe",
          image: image("niaefeup/tts-fe", tag),
          imagePullPolicy: "Always",
          resources: { limits },
          ports: [{ containerPort: 80 }],
        },
      ],
      targetPort: 80,
      dependsOn: [ns],
    },
    { dependsOn: [ns] },
  );

  const backend = new WebApp(
    "tts-backend",
    {
      namespace,
      serviceName: "tts-backend-service",
      labels: { app: "tts-backend" },
      keel: true,
      pullSecret: true,
      containers: [
        {
          name: "tts-be",
          image: image("niaefeup/tts-be", tag),
          imagePullPolicy: "Always",
          resources: { limits },
          ports: [{ containerPort: 8000 }],
          envFrom: [{ secretRef: { name: envSecretName } }],
        },
      ],
      targetPort: 8000,
      dependsOn: [ns, envSecret],
    },
    { dependsOn: [ns] },
  );

  const stripApi = stripPrefix(namespace, "tts-strip-api-prefix", ["/api"], {
    dependsOn: [ns],
  });
  const secretName = `${namespace}-certificate-secret`;

  new TlsIngress("tts", {
    namespace,
    name: `${namespace}-https`,
    certificate: {
      name: `${namespace}-certificate`,
      secretName,
      issuer: "letsencrypt-production",
      hosts: [host],
    },
    routes: [
      {
        kind: "Rule",
        match: hostRule([host], "/api"),
        services: [backend.target],
        middlewares: [{ name: stripApi.metadata.name }],
      },
      { kind: "Rule", match: hostRule([host]), services: [frontend.target] },
    ],
  });

  if (legacyRedirect) {
    const legacyCertificate = niFeUpPtCertificate(namespace, [ns]);

    const redirectName = "tts-redirect-to-primary-address";
    const redirect = new crds.traefik.v1alpha1.Middleware(
      `${namespace}-${redirectName}`,
      {
        metadata: { name: redirectName, namespace },
        spec: {
          redirectRegex: {
            regex: "^https://ni.fe.up.pt/tts/?(.*)",
            replacement: `https://${host}/$1`,
            permanent: false,
          },
        },
      },
      { dependsOn: [traefik().release, ns] },
    );

    new TlsIngress("tts-legacy", {
      namespace,
      name: `${namespace}-legacy-https`,
      tlsSecretName: "website-cert",
      routes: [
        {
          kind: "Rule",
          match: hostRule(["ni.fe.up.pt"], "/tts"),
          services: [noopService],
          middlewares: [{ name: redirect.metadata.name }],
        },
      ],
      dependsOn: [legacyCertificate],
    });
  }

  // The scrapers fill the database with the data of the faculty
  const scraperSecretName = "tts-scrapper-secrets";
  const scraperSecret = new k8s.core.v1.Secret(
    `${namespace}-${scraperSecretName}`,
    {
      metadata: { name: scraperSecretName, namespace },
      type: "Opaque",
      stringData: {
        TTS_SCRAPY_USER: config.requireSecret(`${namespace}/scrapy-user`),
        TTS_SCRAPY_PASSWORD: config.requireSecret(
          `${namespace}/scrapy-password`,
        ),
        TTS_SCRAPY_YEAR: config.require(`${namespace}/scrapy-year`),
        POSTGRES_DB: config.require(`${namespace}/postgres-db`),
        POSTGRES_HOST: postgres().rwService,
        POSTGRES_PASSWORD: rolePassword(namespace),
        POSTGRES_PORT: "5432",
        POSTGRES_USER: namespace,
      },
    },
    { dependsOn: [ns] },
  );

  for (const scraper of scrapers) {
    new CronApp(
      scraper.name,
      {
        namespace,
        schedule: scraper.schedule,
        image: image("niaefeup/uporto-schedule-scrapper", "master"),
        command: ["/bin/sh", "-c"],
        args: [scraperScript(scraper.make)],
        envFromSecret: scraperSecretName,
        keel: true,
      },
      { dependsOn: [scraperSecret] },
    );
  }
}

export const tts = () =>
  ttsApp({
    namespace: "tts",
    host: "tts.niaefeup.pt",
    tag: "main",
    legacyRedirect: true,
    scrapers: [
      {
        name: "automated-scrapper",
        schedule: "0 */6 * * *",
        make: "make info faculties courses course_units course_metadata",
      },
      {
        name: "class-vacancies-scrapper",
        schedule: "0 */1 * * *",
        make: "make class_vacancies",
      },
    ],
  });

export const ttsStaging = () =>
  ttsApp({
    namespace: "tts-staging",
    host: "tts-staging.niaefeup.pt",
    tag: "develop",
    scrapers: [
      {
        name: "automated-scrapper",
        // PHASE0: this runs every minute on the 4th of the month, was it meant to be "0 4 * * *"?
        schedule: "* * 4 * *",
        make: "make info faculties courses course_units course_metadata slots",
      },
    ],
  });
