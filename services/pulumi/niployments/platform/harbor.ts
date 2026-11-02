import * as pulumi from "@pulumi/pulumi";
import * as crds from "@pulumi/crds";
import { entryPoints } from "#config";
import { AppNamespace } from "#components/app-namespace.js";
import { HelmApp } from "#components/helm-app.js";
import { TlsIngress } from "#components/tls-ingress.js";
import { lazy } from "#utils/lazy.js";
import { hostRule, noopService } from "#utils/traefik.js";
import { traefik } from "./traefik.js";
import { storage } from "./storage.js";

const namespace = "image-registry";
const registry = "registry.niaefeup.pt";
const harbor = "harbor.niaefeup.pt";
const harborApiPaths =
  "PathPrefix(`/api/`, `/c/`, `/chartrepo/`, `/service/`, `/v2/`)";

/**
 * Harbor, our container image registry.
 */
export const imageRegistry = lazy(() => {
  const config = new pulumi.Config();
  const ns = new AppNamespace(namespace, { stateful: true });

  const app = new HelmApp(
    "harbor",
    {
      namespace,
      releaseName: "harbor",
      chart: "harbor",
      repo: "https://helm.goharbor.io",
      assets: "harbor",
      stateful: true,
      values: {
        harborAdminPassword: config.requireSecret("harbor/admin-password"),
        secretKey: config.requireSecret("harbor/secret-key"),
      },
      dependsOn: [ns, ...storage()],
    },
    { dependsOn: [ns] },
  );

  const redirect = new crds.traefik.v1alpha1.Middleware(
    `${namespace}-http2https`,
    {
      metadata: { name: "http2https", namespace },
      spec: { redirectScheme: { scheme: "https", permanent: true } },
    },
    { dependsOn: [traefik().release] },
  );
  const middlewares = [{ name: redirect.metadata.name }];

  const core = { name: "harbor-core", port: 80 };

  new TlsIngress("harbor-https", {
    namespace,
    name: "harbor-https",
    certificate: {
      name: "harbor-tls",
      secretName: "harbor-tls",
      issuer: "letsencrypt-production",
      commonName: registry,
      hosts: [harbor, registry, "notary.niaefeup.pt"],
    },
    routes: [
      {
        kind: "Rule",
        match: hostRule([registry]),
        services: [core],
        middlewares,
      },
      {
        kind: "Rule",
        match: `${hostRule([harbor])} && ${harborApiPaths}`,
        services: [core],
        middlewares,
      },
      {
        kind: "Rule",
        match: hostRule([harbor]),
        services: [{ name: "harbor-portal", port: 80 }],
        middlewares,
      },
    ],
    dependsOn: [app.release],
  });

  // Plain HTTP only redirects to HTTPS
  new TlsIngress("harbor-http", {
    namespace,
    name: "harbor-http",
    insecure: true,
    entryPoints: [entryPoints.http],
    routes: [
      {
        kind: "Rule",
        match: hostRule([registry]),
        services: [noopService],
        middlewares,
      },
      {
        kind: "Rule",
        match: `${hostRule([harbor])} && ${harborApiPaths}`,
        services: [noopService],
        middlewares,
      },
      {
        kind: "Rule",
        match: hostRule([harbor]),
        services: [noopService],
        middlewares,
      },
    ],
  });

  return { release: app.release };
});
