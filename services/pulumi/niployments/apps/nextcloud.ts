import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { AppNamespace } from "#components/app-namespace.js";
import { HelmApp } from "#components/helm-app.js";
import { TlsIngress } from "#components/tls-ingress.js";
import { nfsProvisioner } from "#platform/nfs-provisioner.js";
import { hostRule } from "#utils/traefik.js";

const namespace = "nextcloud";
const host = "drive.niaefeup.pt";

/** Nextcloud (drive.niaefeup.pt), storing its files on the NFS server. */
export function nextcloud() {
  const config = new pulumi.Config();
  const ns = new AppNamespace(namespace, { stateful: true });

  const secrets = new k8s.core.v1.Secret(
    "nextcloud-secrets",
    {
      metadata: { name: "nextcloud-secrets", namespace },
      type: "Opaque",
      stringData: {
        "nextcloud-username": config.requireSecret("nextcloud/username"),
        "nextcloud-password": config.requireSecret("nextcloud/password"),
        "nextcloud-token": config.requireSecret("nextcloud/token"),
        "db-username": config.requireSecret("nextcloud/db-username"),
        "db-password": config.requireSecret("nextcloud/db-password"),
        "db-hostname": config.requireSecret("nextcloud/db-hostname"),
        "db-name": config.requireSecret("nextcloud/db-name"),
      },
    },
    { dependsOn: [ns] },
  );

  const app = new HelmApp(
    "nextcloud",
    {
      namespace,
      releaseName: "nextcloud",
      chart: "nextcloud",
      repo: "https://nextcloud.github.io/helm/",
      assets: "nextcloud",
      stateful: true,
      // PHASE0: compare with `helm get values nextcloud -n nextcloud`, the old file leaves these to "FILL-IN"
      values: {
        externalDatabase: {
          password: config.requireSecret("nextcloud/db-password"),
        },
      },
      dependsOn: [ns, secrets, nfsProvisioner()],
    },
    { dependsOn: [ns] },
  );

  new TlsIngress("nextcloud", {
    namespace,
    name: "nextcloud-https",
    certificate: {
      name: "nextcloud-cert",
      secretName: "nextcloud-cert",
      issuer: "letsencrypt-production",
      commonName: host,
      hosts: [host],
    },
    routes: [
      {
        kind: "Rule",
        match: hostRule([host]),
        services: [{ name: "nextcloud", port: 80 }],
      },
    ],
    dependsOn: [app.release],
  });
}
