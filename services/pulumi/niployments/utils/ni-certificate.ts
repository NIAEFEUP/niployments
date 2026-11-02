import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

/**
 * Secret holding the `ni.fe.up.pt` certificate. It is issued by the faculty (not by
 * cert-manager), so it is provided through the stack config and copied to every namespace using it.
 */
export function niFeUpPtCertificate(
  namespace: string,
  dependsOn: pulumi.Resource[] = [],
) {
  const config = new pulumi.Config();

  return new k8s.core.v1.Secret(
    `${namespace}-website-cert`,
    {
      metadata: { name: "website-cert", namespace },
      type: "kubernetes.io/tls",
      stringData: {
        "tls.crt": config.requireSecret("ni-fe-up-pt/cert"),
        "tls.key": config.requireSecret("ni-fe-up-pt/key"),
      },
    },
    { dependsOn },
  );
}
