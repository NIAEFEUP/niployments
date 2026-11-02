import * as pulumi from "@pulumi/pulumi";

export type Environment = "development" | "production";

const config = new pulumi.Config();

const rawEnv = config.require("env");
if (rawEnv !== "development" && rawEnv !== "production") {
  throw new Error(
    `niployments:env must be "development" or "production", got "${rawEnv}"`,
  );
}

export const env: Environment = rawEnv;
export const isProduction = env === "production";

/**
 * Path of the inventory of objects that already exist in the cluster, adopted instead of
 * created (see utils/adopt.ts and MIGRATION.md). Unset when there is nothing to adopt.
 */
export const adoptInventory = config.get("adopt");

/** Everything that can be switched on or off per stack (`niployments:features`). */
const featureNames = [
  // platform
  "replicator",
  "keel",
  "longhorn",
  "nfsProvisioner",
  "externalDns",
  "harbor",
  "monitoring",
  "cilium",
  // databases
  "mongodb",
  "postgres",
  "valkey",
  "pgadmin",
  // apps
  "aefeup",
  "niWebsite",
  "nitsig",
  "inicio",
  "inicioStaging",
  "tts",
  "ttsStaging",
  "ementas",
  "plausible",
  "teup",
  "nextcloud",
  "minicraft",
  // development helpers
  "testApp",
  "game2048",
  "podinfo",
] as const;

export type FeatureName = (typeof featureNames)[number];
type Features = Record<FeatureName, boolean>;

const defaults: Record<Environment, Partial<Features>> = {
  production: {
    ...Object.fromEntries(featureNames.map((name) => [name, true])),
    testApp: false,
    game2048: false,
    podinfo: false,
  },
  development: {
    // Cilium is installed by dev/setup-kind-cluster.sh, Pulumi only manages its CRs
    cilium: true,
    testApp: true,
    game2048: true,
  },
};

const overrides = config.getObject<Partial<Features>>("features") ?? {};

export const features = Object.fromEntries(
  featureNames.map((name) => [
    name,
    overrides[name] ?? defaults[env][name] ?? false,
  ]),
) as Features;

/**
 * Traefik ingress entrypoints.
 */
export const entryPoints = { http: "web", https: "websecure" } as const;

export type IssuerName =
  | "letsencrypt-production"
  | "letsencrypt-staging"
  | "letsencrypt-aefeup"
  | "letsencrypt-teup";

/**
 * Name of the ClusterIssuer to reference for a given logical issuer.
 * Development only has a self-signed `letsencrypt-production`.
 */
export function issuer(name: IssuerName): IssuerName {
  return isProduction ? name : "letsencrypt-production";
}

/**
 * StorageClasses available in every stack. In production they are
 * backed by Longhorn, in development by rancher's local-path provisioner.
 */
export const storageClasses = {
  retain: "longhorn-retain",
  localityRetain: "longhorn-locality-retain",
  locality: "longhorn-locality",
  localityNoBackup: "longhorn-locality-no-backup",
  localityNoBackupRetain: "longhorn-locality-no-backup-retain",
  strictLocal: "longhorn-strict-local",
  strictLocalRetain: "longhorn-strict-local-retain",
  strictLocalNoBackup: "longhorn-strict-local-no-backup",
} as const;
