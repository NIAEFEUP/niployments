import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { AppNamespace } from "#components/app-namespace.js";
import { HelmApp } from "#components/helm-app.js";
import { lazy } from "#utils/lazy.js";

/**
 * Creates the DNS records (Cloudflare) of every Ingress/IngressRoute.
 */
export const externalDns = lazy(() => {
  const config = new pulumi.Config();
  const namespace = new AppNamespace("external-dns");

  const apiKey = new k8s.core.v1.Secret(
    "external-dns-cloudflare-api-key",
    {
      metadata: { name: "cloudflare-api-key", namespace: "external-dns" },
      type: "Opaque",
      stringData: { apiKey: config.requireSecret("external-dns/api-key") },
    },
    { dependsOn: [namespace] },
  );

  return new HelmApp(
    "external-dns",
    {
      namespace: "external-dns",
      releaseName: "external-dns",
      chart: "external-dns",
      repo: "https://kubernetes-sigs.github.io/external-dns/",
      assets: "external-dns",
      dependsOn: [namespace, apiKey],
    },
    { dependsOn: [namespace, apiKey] },
  );
});
