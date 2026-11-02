import * as k8s from "@pulumi/kubernetes";
import { features, isProduction, storageClasses } from "#config";
import { guard } from "#utils/adopt.js";
import { lazy } from "#utils/lazy.js";

type LonghornClass = {
  name: string;
  reclaimPolicy: "Retain" | "Delete";
  replicas: 1 | 3;
  locality: "best-effort" | "strict-local" | "ignored";
  /** Included in the recurring `backup` job. */
  backup: boolean;
  /** Included in the `default` recurring job group. */
  snapshots: boolean;
};

const classes: LonghornClass[] = [
  {
    name: storageClasses.retain,
    reclaimPolicy: "Retain",
    replicas: 3,
    locality: "ignored",
    backup: true,
    snapshots: true,
  },
  {
    name: storageClasses.localityRetain,
    reclaimPolicy: "Retain",
    replicas: 3,
    locality: "best-effort",
    backup: true,
    snapshots: true,
  },
  {
    name: storageClasses.locality,
    reclaimPolicy: "Delete",
    replicas: 3,
    locality: "best-effort",
    backup: true,
    snapshots: true,
  },
  {
    name: storageClasses.localityNoBackup,
    reclaimPolicy: "Delete",
    replicas: 3,
    locality: "best-effort",
    backup: false,
    snapshots: true,
  },
  {
    name: storageClasses.localityNoBackupRetain,
    reclaimPolicy: "Retain",
    replicas: 3,
    locality: "best-effort",
    backup: false,
    snapshots: true,
  },
  {
    name: storageClasses.strictLocal,
    reclaimPolicy: "Delete",
    replicas: 1,
    locality: "strict-local",
    backup: true,
    snapshots: true,
  },
  {
    name: storageClasses.strictLocalRetain,
    reclaimPolicy: "Retain",
    replicas: 1,
    locality: "strict-local",
    backup: true,
    snapshots: true,
  },
  {
    name: storageClasses.strictLocalNoBackup,
    reclaimPolicy: "Delete",
    replicas: 1,
    locality: "strict-local",
    backup: false,
    snapshots: false,
  },
];

function recurringJobSelector(storageClass: LonghornClass) {
  const jobs = [];
  if (storageClass.snapshots) jobs.push({ name: "default", isGroup: true });
  if (storageClass.backup) jobs.push({ name: "backup", isGroup: false });

  return jobs.length > 0 ? JSON.stringify(jobs) : undefined;
}

/**
 * The StorageClasses every stateful service refers to by name.
 * Production uses Longhorn, development falls back to the local-path provisioner of kind
 * (unless Longhorn is explicitly enabled there).
 */
export const storage = lazy(() => {
  if (isProduction || features.longhorn) {
    // PHASE0: StorageClass.parameters are immutable, compare with `kubectl get sc -o yaml` before the first up
    return classes.map(
      (storageClass) =>
        new k8s.storage.v1.StorageClass(
          storageClass.name,
          {
            metadata: { name: storageClass.name },
            provisioner: "driver.longhorn.io",
            allowVolumeExpansion: true,
            reclaimPolicy: storageClass.reclaimPolicy,
            volumeBindingMode: "Immediate",
            parameters: {
              numberOfReplicas: String(storageClass.replicas),
              staleReplicaTimeout: "720",
              fromBackup: "",
              fsType: "ext4",
              dataLocality: storageClass.locality,
              replicaAutoBalance:
                storageClass.locality === "strict-local"
                  ? "ignored"
                  : "least-effort",
              ...(recurringJobSelector(storageClass) && {
                recurringJobSelector: recurringJobSelector(storageClass)!,
              }),
            },
          },
          { ...guard() },
        ),
    );
  }

  return classes.map(
    (storageClass) =>
      new k8s.storage.v1.StorageClass(storageClass.name, {
        metadata: { name: storageClass.name },
        provisioner: "rancher.io/local-path",
        reclaimPolicy: storageClass.reclaimPolicy,
        volumeBindingMode: "WaitForFirstConsumer",
      }),
  );
});
