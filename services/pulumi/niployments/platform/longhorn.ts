import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as crds from "@pulumi/crds";
import { AppNamespace } from "#components/app-namespace.js";
import { HelmApp } from "#components/helm-app.js";
import { guard } from "#utils/adopt.js";
import { lazy } from "#utils/lazy.js";
import { storage } from "./storage.js";

const longhornVersion = "v1.6.1";
const prerequisites = [
  "longhorn-iscsi-selinux-workaround",
  "longhorn-iscsi-installation",
  "longhorn-nfs-installation",
];

/**
 * Replicated block storage. Also creates the StorageClasses and the recurring snapshot/backup jobs.
 */
export const longhorn = lazy(() => {
  const config = new pulumi.Config();
  const namespace = new AppNamespace("longhorn-system", { stateful: true });

  // Longhorn prerequisites on NiNux (should eventually be part of the OS image)
  // PHASE0: these were applied with kubectl, check that they are adopted instead of conflicting
  const prerequisiteManifests = prerequisites.map(
    (name) =>
      new k8s.yaml.v2.ConfigFile(name, {
        file: `https://raw.githubusercontent.com/longhorn/longhorn/${longhornVersion}/deploy/prerequisite/${name}.yaml`,
        skipAwait: true,
      }),
  );

  const backupSecret = new k8s.core.v1.Secret(
    "longhorn-cloudflare-r2-backups",
    {
      metadata: {
        name: "longhorn-cloudflare-r2-backups",
        namespace: "longhorn-system",
      },
      type: "Opaque",
      stringData: {
        AWS_ACCESS_KEY_ID: config.requireSecret("longhorn/r2-access-key-id"),
        AWS_SECRET_ACCESS_KEY: config.requireSecret(
          "longhorn/r2-secret-access-key",
        ),
        AWS_ENDPOINTS: config.requireSecret("longhorn/r2-endpoint"),
      },
    },
    {
      dependsOn: [namespace],
    },
  );

  const app = new HelmApp(
    "longhorn",
    {
      namespace: "longhorn-system",
      releaseName: "longhorn",
      chart: "longhorn",
      repo: "https://charts.longhorn.io",
      assets: "longhorn",
      stateful: true,
      dependsOn: [namespace, ...prerequisiteManifests],
    },
    { dependsOn: [namespace] },
  );

  const recurringJob = (
    name: string,
    spec: Pick<
      crds.types.input.longhorn.v1beta2.RecurringJobSpec,
      "cron" | "task"
    >,
  ) =>
    new crds.longhorn.v1beta2.RecurringJob(
      name,
      {
        metadata: { name, namespace: "longhorn-system" },
        spec: { ...spec, name, concurrency: 1, groups: ["default"], retain: 3 },
      },
      {
        dependsOn: [app.release],

        ...guard(),
      },
    );

  recurringJob("daily-snapshot", { cron: "0 2 * * *", task: "snapshot" });
  recurringJob("cf-backup", { cron: "0 2 * * */3", task: "backup" });

  storage();

  return { release: app.release, backupSecret };
});
