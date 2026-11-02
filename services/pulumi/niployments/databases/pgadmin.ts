import * as pulumi from "@pulumi/pulumi";
import { AppNamespace } from "#components/app-namespace.js";
import { HelmApp } from "#components/helm-app.js";
import { TlsIngress } from "#components/tls-ingress.js";
import { lazy } from "#utils/lazy.js";
import { hostRule } from "#utils/traefik.js";
import { postgres } from "./postgres/index.js";

const namespace = "pgadmin";
const host = "pgadmin.niaefeup.pt";

export const pgadmin = lazy(() => {
  const config = new pulumi.Config();
  const ns = new AppNamespace(namespace, { stateful: true });

  const app = new HelmApp(
    "pgadmin",
    {
      namespace,
      releaseName: "pgadmin4",
      chart: "pgadmin4",
      repo: "https://helm.runix.net",
      assets: "pgadmin",
      stateful: true,
      values: {
        env: {
          email: config.requireSecret("pgadmin/email"),
          password: config.requireSecret("pgadmin/password"),
        },
        // pgAdmin connects to the cluster as the superuser
        serverDefinitions: {
          servers: {
            "ni-superuser": {
              Password: config.requireSecret("postgres/ni-password"),
            },
          },
        },
      },
      dependsOn: [ns, postgres()],
    },
    { dependsOn: [ns] },
  );

  new TlsIngress("pgadmin", {
    namespace,
    name: "pgadmin-https",
    certificate: {
      name: "pgadmin-cert",
      secretName: "pgadmin-cert",
      issuer: "letsencrypt-production",
      commonName: host,
      hosts: [host],
    },
    routes: [
      {
        kind: "Rule",
        match: hostRule([host]),
        services: [{ name: "pgadmin4", port: 80 }],
      },
    ],
    dependsOn: [app.release],
  });

  return app;
});
