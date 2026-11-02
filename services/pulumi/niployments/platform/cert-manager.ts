import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as crds from "@pulumi/crds";
import { isProduction } from "#config";
import { AppNamespace } from "#components/app-namespace.js";
import { HelmApp } from "#components/helm-app.js";
import { lazy } from "#utils/lazy.js";

const acmeStaging = "https://acme-staging-v02.api.letsencrypt.org/directory";
const acmeProduction = "https://acme-v02.api.letsencrypt.org/directory";

type CloudflareSecret = { name: string; configKey: string };

/**
 * cert-manager and the ClusterIssuers used by every certificate.
 * Development only has a self-signed `letsencrypt-production` issuer.
 */
export const certManager = lazy(() => {
  const namespace = new AppNamespace("cert-manager");

  const app = new HelmApp(
    "cert-manager",
    {
      namespace: "cert-manager",
      releaseName: "cert-manager",
      chart: "cert-manager",
      repo: "https://charts.jetstack.io",
      assets: "cert-manager",
      dependsOn: [namespace],
    },
    { dependsOn: [namespace] },
  );

  const release = app.release;

  const issuer = (
    name: string,
    spec: crds.types.input.cert_manager.v1.ClusterIssuerSpec,
    dependsOn: pulumi.Resource[] = [],
  ) =>
    new crds.cert_manager.v1.ClusterIssuer(
      name,
      { metadata: { name }, spec },
      { dependsOn: [release, ...dependsOn] },
    );

  if (!isProduction) {
    issuer("letsencrypt-production", { selfSigned: {} });
    return { release };
  }

  const config = new pulumi.Config();

  const tokenSecret = ({ name, configKey }: CloudflareSecret) =>
    new k8s.core.v1.Secret(
      name,
      {
        metadata: { name, namespace: "cert-manager" },
        type: "Opaque",
        stringData: { "api-token": config.requireSecret(configKey) },
      },
      { dependsOn: [namespace] },
    );

  const defaultToken = tokenSecret({
    name: "cloudflare-api-token-secret",
    configKey: "cloudflare/api-token",
  });
  const aefeupToken = tokenSecret({
    name: "cloudflare-aefeup-api-token-secret",
    configKey: "cloudflare/aefeup-api-token",
  });

  const cloudflare = (email: string, secret: k8s.core.v1.Secret) => ({
    email,
    apiTokenSecretRef: { name: secret.metadata.name, key: "api-token" },
  });

  issuer(
    "letsencrypt-staging",
    {
      acme: {
        email: "ni@aefeup.pt",
        privateKeySecretRef: { name: "letsencrypt-staging" },
        server: acmeStaging,
        solvers: [
          { dns01: { cloudflare: cloudflare("ni@aefeup.pt", defaultToken) } },
        ],
      },
    },
    [defaultToken],
  );

  issuer(
    "letsencrypt-production",
    {
      acme: {
        email: "ni@aefeup.pt",
        privateKeySecretRef: { name: "letsencrypt-production" },
        server: acmeProduction,
        solvers: [
          { dns01: { cloudflare: cloudflare("ni@aefeup.pt", defaultToken) } },
        ],
      },
    },
    [defaultToken],
  );

  issuer(
    "letsencrypt-aefeup",
    {
      acme: {
        email: "geral@aefeup.pt",
        privateKeySecretRef: { name: "letsencrypt-aefeup" },
        server: acmeProduction,
        solvers: [
          { dns01: { cloudflare: cloudflare("geral@aefeup.pt", aefeupToken) } },
        ],
      },
    },
    [aefeupToken],
  );

  issuer(
    "letsencrypt-teup",
    {
      acme: {
        email: "ni@aefeup.pt",
        privateKeySecretRef: { name: "letsencrypt-teup" },
        server: acmeProduction,
        solvers: [
          {
            selector: { dnsZones: ["teup.pt"] },
            dns01: {
              cnameStrategy: "Follow",
              cloudflare: cloudflare("ni@aefeup.pt", defaultToken),
            },
          },
          {
            selector: { dnsZones: ["niaefeup.pt"] },
            dns01: { cloudflare: cloudflare("ni@aefeup.pt", defaultToken) },
          },
        ],
      },
    },
    [defaultToken],
  );

  return { release };
});
