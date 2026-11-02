import * as pulumi from "@pulumi/pulumi";
import { AppNamespace } from "#components/app-namespace.js";
import { HelmApp } from "#components/helm-app.js";
import { lazy } from "#utils/lazy.js";
import { storage } from "#platform/storage.js";

export const valkey = lazy(() => {
  const config = new pulumi.Config();
  const namespace = new AppNamespace("valkey", { stateful: true });

  return new HelmApp(
    "valkey",
    {
      namespace: "valkey",
      releaseName: "valkey",
      chart: "valkey",
      repo: "https://charts.bitnami.com/bitnami",
      assets: "valkey",
      stateful: true,
      values: { auth: { password: config.requireSecret("valkey/password") } },
      dependsOn: [namespace, ...storage()],
    },
    { dependsOn: [namespace] },
  );
});
