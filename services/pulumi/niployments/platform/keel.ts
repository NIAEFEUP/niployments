import { AppNamespace } from "#components/app-namespace.js";
import { HelmApp } from "#components/helm-app.js";
import { lazy } from "#utils/lazy.js";

/**
 * Keel redeploys workloads annotated with `keel.sh/policy` when a new image is pushed.
 */
export const keel = lazy(() => {
  const namespace = new AppNamespace("keel");

  return new HelmApp(
    "keel",
    {
      namespace: "keel",
      releaseName: "keel",
      chart: "keel",
      repo: "https://charts.keel.sh",
      assets: "keel",
      skipAwait: true,
      dependsOn: [namespace],
    },
    { dependsOn: [namespace] },
  );
});
