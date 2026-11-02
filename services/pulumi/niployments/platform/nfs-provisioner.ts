import { AppNamespace } from "#components/app-namespace.js";
import { HelmApp } from "#components/helm-app.js";
import { lazy } from "#utils/lazy.js";

export const nfsProvisioner = lazy(() => {
  const namespace = new AppNamespace("nfs-provisioner");

  return new HelmApp(
    "nfs-provisioner",
    {
      namespace: "nfs-provisioner",
      releaseName: "nfs-subdir-external-provisioner",
      chart: "nfs-subdir-external-provisioner",
      repo: "https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner",
      assets: "nfs-provisioner",
      skipAwait: true,
      dependsOn: [namespace],
    },
    { dependsOn: [namespace] },
  );
});
