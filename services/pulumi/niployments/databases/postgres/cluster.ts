import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as crds from "@pulumi/crds";
import { storageClasses } from "#config";
import { AppNamespace } from "#components/app-namespace.js";
import { guard } from "#utils/adopt.js";
import { onFinalize } from "#utils/finalize.js";
import { cnpgOperator } from "./operator.js";

const namespace = "pg";
const clusterName = "cnpg-cluster";

export type PostgresRole = {
  name: string;
  password: pulumi.Input<string>;
  superuser?: boolean;
};

type ManagedRole = crds.types.input.postgresql.v1.ClusterSpecManagedRoles;

// The order of `managed.roles` in the live Cluster. It is a list, so a different order is a diff.
const liveRoleOrder = [
  "ni",
  "plausible",
  "sinf-website-2023",
  "tts",
  "tts-staging",
  "website-ae",
  "teup",
  "inicio",
  "inicio-staging",
];

function sortRoles(roles: { name: string; role: ManagedRole }[]) {
  const position = ({ name }: { name: string }) => {
    const index = liveRoleOrder.indexOf(name);
    return index === -1 ? liveRoleOrder.length : index;
  };

  return [...roles]
    .sort((a, b) => position(a) - position(b))
    .map(({ role }) => role);
}

/**
 * The shared PostgreSQL cluster. Every app registers its own role with `addRole`
 * (the password is stored in a `<role>-secret` basic-auth secret, as CNPG expects).
 * The cluster itself is created once all the roles are known.
 */
export class PostgresCluster extends pulumi.ComponentResource {
  private readonly roles: { name: string; role: ManagedRole }[] = [];
  private readonly dependencies: pulumi.Resource[] = [];

  public readonly rwService = `${clusterName}-rw.${namespace}.svc.cluster.local`;

  constructor(name: string, opts?: pulumi.ComponentResourceOptions) {
    super("niployments:postgres:PostgresCluster", name, {}, opts);

    const config = new pulumi.Config();
    const ns = new AppNamespace(
      namespace,
      { stateful: true },
      { parent: this },
    );

    const backupSecret = new k8s.core.v1.Secret(
      "cnpg-backup-secret",
      {
        metadata: { name: "cnpg-backup-secret", namespace },
        type: "Opaque",
        stringData: {
          ACCESS_KEY_ID: config.requireSecret("postgres/backup-access-key-id"),
          ACCESS_SECRET_KEY: config.requireSecret(
            "postgres/backup-secret-access-key",
          ),
        },
      },
      {
        parent: this,
        dependsOn: [ns],
      },
    );

    this.dependencies.push(ns, backupSecret);
    onFinalize(() => this.createCluster(config));
  }

  private createCluster(config: pulumi.Config) {
    const cluster = new crds.postgresql.v1.Cluster(
      clusterName,
      {
        metadata: { name: clusterName, namespace },
        spec: {
          instances: 3,
          managed: { roles: sortRoles(this.roles) },
          storage: {
            size: "40Gi",
            // backups are handled by CloudNativePG
            storageClass: storageClasses.strictLocalNoBackup,
          },
          postgresql: { parameters: { max_slot_wal_keep_size: "10GB" } },
          backup: {
            barmanObjectStore: {
              destinationPath: "s3://niployments-postgres-backup/",
              endpointURL: config.require("postgres/backup-endpoint"),
              s3Credentials: {
                accessKeyId: {
                  name: "cnpg-backup-secret",
                  key: "ACCESS_KEY_ID",
                },
                secretAccessKey: {
                  name: "cnpg-backup-secret",
                  key: "ACCESS_SECRET_KEY",
                },
              },
              wal: { compression: "gzip" },
            },
            retentionPolicy: "15d",
          },
        },
      },
      {
        parent: this,
        dependsOn: [cnpgOperator(), ...this.dependencies],

        ...guard(),
      },
    );

    new crds.postgresql.v1.ScheduledBackup(
      "cluster-backup-object-store",
      {
        metadata: { name: "cluster-backup-object-store", namespace },
        spec: {
          cluster: { name: clusterName },
          method: "barmanObjectStore",
          // Sundays, Tuesdays and Thursdays
          schedule: "0 0 0 * * 0,2,4",
          backupOwnerReference: "cluster",
          immediate: true,
        },
      },
      {
        parent: this,
        dependsOn: [cluster],
      },
    );
  }

  public addRole(role: PostgresRole) {
    const secretName = `${role.name}-secret`;

    const secret = new k8s.core.v1.Secret(
      secretName,
      {
        metadata: { name: secretName, namespace },
        type: "kubernetes.io/basic-auth",
        stringData: { username: role.name, password: role.password },
      },
      { parent: this },
    );

    this.dependencies.push(secret);
    this.roles.push({
      name: role.name,
      role: {
        name: role.name,
        ensure: "present",
        login: true,
        ...(role.superuser ? { superuser: true } : { createdb: false }),
        passwordSecret: { name: secretName },
      },
    });

    return this;
  }
}
