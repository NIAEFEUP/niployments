import * as k8s from "@pulumi/kubernetes";
import { AppNamespace } from "#components/app-namespace.js";
import { HelmApp } from "#components/helm-app.js";
import { replicator } from "#platform/replicator.js";
import { lazy } from "#utils/lazy.js";

/**
 * The MongoDB community operator.
 */
export const mongodbOperator = lazy(() => {
  const namespace = new AppNamespace("mongodb", { stateful: true });

  // TODO: use the CRDs of the official chart once the fork is not needed anymore
  const crds = new k8s.yaml.v2.ConfigFile("mongodb-community-operator-crds", {
    skipAwait: true,
    file: "https://raw.githubusercontent.com/limwa/mongodb-kubernetes-operator/master/config/crd/bases/mongodbcommunity.mongodb.com_mongodbcommunity.yaml",
  });

  const app = new HelmApp(
    "mongodb-community-operator",
    {
      namespace: "mongodb",
      releaseName: "community-operator",
      chart: "community-operator",
      repo: "https://mongodb.github.io/helm-charts",
      assets: "mongodb",
      // CRDs are installed above
      skipCrds: true,
      skipAwait: true,
      stateful: true,
      dependsOn: [namespace, crds, replicator().release],
    },
    { dependsOn: [namespace] },
  );

  return { namespace, release: app.release };
});
