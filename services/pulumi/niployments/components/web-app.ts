import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { pullSecretName } from "#utils/registry.js";

export type WebAppArgs = {
  namespace: string;
  /** `metadata.name` of the Deployment (defaults to `name`). */
  deploymentName?: string;
  /** `metadata.name` of the Service (defaults to `<name>-service`). */
  serviceName?: string;
  /** Pod labels, also used as selector. Immutable once deployed. Defaults to `app: <deploymentName>`. */
  labels?: Record<string, string>;
  replicas?: number;
  strategy?: "Recreate" | "RollingUpdate";
  /** Let Keel redeploy the Deployment whenever its image tag is pushed. */
  keel?: boolean;
  /** Pull images using `harbor-pull-secret`. */
  pullSecret?: boolean;
  containers: pulumi.Input<k8s.types.input.core.v1.Container>[];
  volumes?: pulumi.Input<k8s.types.input.core.v1.Volume>[];
  /** Port the Service exposes (defaults to 80). */
  port?: number;
  /** Container port the Service forwards to. */
  targetPort: number;
  dependsOn?: pulumi.Input<pulumi.Resource>[];
};

/**
 * A Deployment and the ClusterIP Service in front of it.
 */
export class WebApp extends pulumi.ComponentResource {
  public readonly deployment: k8s.apps.v1.Deployment;
  public readonly service: k8s.core.v1.Service;
  /** What an IngressRoute needs to route to this app. */
  public readonly target: { name: string; port: number };

  constructor(
    name: string,
    args: WebAppArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super("niployments:k8s:WebApp", `${args.namespace}-${name}`, {}, opts);

    const deploymentName = args.deploymentName ?? name;
    const serviceName = args.serviceName ?? `${name}-service`;
    const labels = args.labels ?? { app: deploymentName };
    const port = args.port ?? 80;

    this.deployment = new k8s.apps.v1.Deployment(
      `${args.namespace}-${deploymentName}`,
      {
        metadata: {
          name: deploymentName,
          namespace: args.namespace,
          annotations: args.keel
            ? { "keel.sh/policy": "force", "keel.sh/match-tag": "true" }
            : undefined,
        },
        spec: {
          replicas: args.replicas,
          selector: { matchLabels: labels },
          strategy: args.strategy ? { type: args.strategy } : undefined,
          template: {
            metadata: { labels },
            spec: {
              containers: args.containers,
              volumes: args.volumes,
              imagePullSecrets: args.pullSecret
                ? [{ name: pullSecretName }]
                : undefined,
            },
          },
        },
      },
      {
        parent: this,
        dependsOn: args.dependsOn,
      },
    );

    this.service = new k8s.core.v1.Service(
      `${args.namespace}-${serviceName}`,
      {
        metadata: { name: serviceName, namespace: args.namespace },
        spec: {
          type: "ClusterIP",
          selector: labels,
          ports: [{ port, targetPort: args.targetPort }],
        },
      },
      {
        parent: this,
        // assigned by the API server: when a live Service is adopted they differ from the
        // (unset) inputs and would force a replacement, which changes the cluster IP
        ignoreChanges: ["spec.clusterIP", "spec.clusterIPs"],
      },
    );

    this.target = { name: serviceName, port };

    this.registerOutputs({
      deployment: this.deployment,
      service: this.service,
    });
  }
}
