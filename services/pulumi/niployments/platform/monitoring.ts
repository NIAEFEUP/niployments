import * as pulumi from "@pulumi/pulumi";
import { AppNamespace } from "#components/app-namespace.js";
import { HelmApp } from "#components/helm-app.js";
import { TlsIngress } from "#components/tls-ingress.js";
import { lazy } from "#utils/lazy.js";
import { hostRule } from "#utils/traefik.js";
import { storage } from "./storage.js";

const namespace = "monitoring";
const grafanaHost = "grafana.niaefeup.pt";

/**
 * Loki (logs), Prometheus (metrics) and Grafana.
 */
export const monitoring = lazy(() => {
  const config = new pulumi.Config();
  const ns = new AppNamespace(namespace, { stateful: true });
  const volumes = storage();

  const loki = new HelmApp(
    "loki",
    {
      namespace,
      releaseName: "loki",
      chart: "loki",
      repo: "https://grafana.github.io/helm-charts",
      versionKey: "loki",
      assets: "monitoring/loki",
      stateful: true,
      values: { loki: { auth_enabled: false } },
      dependsOn: [ns, ...volumes],
    },
    { dependsOn: [ns] },
  );

  const prometheus = new HelmApp(
    "kube-prometheus",
    {
      namespace,
      releaseName: "kube-prometheus",
      chart: "kube-prometheus-stack",
      repo: "https://prometheus-community.github.io/helm-charts",
      assets: "monitoring/kube-prometheus",
      stateful: true,
      values: {
        grafana: {
          adminPassword: config.requireSecret(
            "monitoring/grafana-admin-password",
          ),
        },
      },
      dependsOn: [ns, ...volumes],
    },
    { dependsOn: [ns] },
  );

  new TlsIngress("grafana", {
    namespace,
    name: "grafana-https",
    certificate: {
      name: "grafana-cert",
      secretName: "grafana-cert",
      issuer: "letsencrypt-aefeup",
      commonName: grafanaHost,
      hosts: [grafanaHost],
    },
    routes: [
      {
        kind: "Rule",
        match: hostRule([grafanaHost]),
        services: [{ name: "kube-prometheus-grafana", port: 80 }],
      },
    ],
    dependsOn: [prometheus.release],
  });

  return { loki: loki.release, prometheus: prometheus.release };
});
