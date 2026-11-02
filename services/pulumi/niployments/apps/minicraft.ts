import { AppNamespace } from "#components/app-namespace.js";
import { HelmApp } from "#components/helm-app.js";
import { storage } from "#platform/storage.js";

const namespace = "minicraft";

/**
 * The minecraft server of NI. It is deployed through its own local chart,
 * so the Helm release that is already running can be adopted as is.
 */
export function minicraft() {
  const ns = new AppNamespace(namespace, { stateful: true });

  return new HelmApp(
    "minicraft",
    {
      namespace,
      releaseName: "minecraft",
      chart: "./assets/minicraft/chart",
      stateful: true,
      dependsOn: [ns, ...storage()],
    },
    { dependsOn: [ns] },
  );
}
