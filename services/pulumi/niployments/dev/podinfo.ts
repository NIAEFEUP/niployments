import { AppNamespace } from "#components/app-namespace.js";
import { HelmApp } from "#components/helm-app.js";

/** podinfo, used in the onboarding to learn about Helm. */
export function podinfo() {
  const ns = new AppNamespace("podinfo");

  return new HelmApp(
    "podinfo",
    {
      namespace: "podinfo",
      releaseName: "podinfo",
      chart: "podinfo",
      repo: "https://stefanprodan.github.io/podinfo",
      assets: "podinfo",
      dependsOn: [ns],
    },
    { dependsOn: [ns] },
  );
}
