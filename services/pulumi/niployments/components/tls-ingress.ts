import * as pulumi from "@pulumi/pulumi";
import * as crds from "@pulumi/crds";
import {
  entryPoints as defaultEntryPoints,
  issuer,
  type IssuerName,
} from "#config";
import { certManager } from "#platform/cert-manager.js";
import { traefik } from "#platform/traefik.js";

export type TlsIngressArgs = {
  namespace: string;
  /** `metadata.name` of the IngressRoute. */
  name: string;
  /** Issue a certificate for the route. Omit it to reuse an existing secret. */
  certificate?: {
    /** `metadata.name` of the Certificate. */
    name: string;
    secretName: string;
    issuer: IssuerName;
    hosts: string[];
    commonName?: string;
  };
  /** Secret holding the TLS certificate, when it is not issued by `certificate`. */
  tlsSecretName?: string;
  /** Serve plain HTTP (no TLS) on `web`. */
  insecure?: boolean;
  entryPoints?: string[];
  routes: pulumi.Input<crds.types.input.traefik.v1alpha1.IngressRouteSpecRoutes>[];
  dependsOn?: pulumi.Input<pulumi.Resource>[];
};

/**
 * A Traefik IngressRoute and, usually, the certificate-manager Certificate it serves.
 */
export class TlsIngress extends pulumi.ComponentResource {
  public readonly certificate?: crds.cert_manager.v1.Certificate;
  public readonly ingressRoute: crds.traefik.v1alpha1.IngressRoute;

  constructor(
    name: string,
    args: TlsIngressArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super("niployments:k8s:TlsIngress", `${args.namespace}-${name}`, {}, opts);

    if (args.certificate) {
      const { certificate } = args;

      this.certificate = new crds.cert_manager.v1.Certificate(
        `${args.namespace}-${certificate.name}`,
        {
          metadata: { name: certificate.name, namespace: args.namespace },
          spec: {
            secretName: certificate.secretName,
            issuerRef: {
              name: issuer(certificate.issuer),
              kind: "ClusterIssuer",
            },
            commonName: certificate.commonName,
            dnsNames: certificate.hosts,
          },
        },
        {
          parent: this,
          dependsOn: [certManager().release],
        },
      );
    }

    const secretName = args.certificate?.secretName ?? args.tlsSecretName;

    this.ingressRoute = new crds.traefik.v1alpha1.IngressRoute(
      `${args.namespace}-${args.name}`,
      {
        metadata: { name: args.name, namespace: args.namespace },
        spec: {
          entryPoints: args.entryPoints ?? [
            args.insecure ? defaultEntryPoints.http : defaultEntryPoints.https,
          ],
          routes: args.routes,
          tls: args.insecure ? undefined : { secretName },
        },
      },
      {
        parent: this,
        dependsOn: [
          traefik().release,
          ...(this.certificate ? [this.certificate] : []),
          ...(args.dependsOn ?? []),
        ],
      },
    );

    this.registerOutputs({
      certificate: this.certificate,
      ingressRoute: this.ingressRoute,
    });
  }
}
