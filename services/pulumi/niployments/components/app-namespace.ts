import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { guard } from "#utils/adopt.js";
import { dockerConfigJson, pullSecretName } from "#utils/registry.js";

export type AppNamespaceArgs = {
  /** Namespaces holding data (volumes, databases) are protected from deletion. */
  stateful?: boolean;
  /** Creates the `harbor-pull-secret` used to pull images from our registry. */
  pullSecret?: boolean;
};

/**
 * A namespace and, optionally, the registry pull secret every private image needs.
 */
export class AppNamespace extends pulumi.ComponentResource {
  public readonly name: string;
  public readonly namespace: k8s.core.v1.Namespace;
  public readonly pullSecret?: k8s.core.v1.Secret;

  constructor(
    name: string,
    args: AppNamespaceArgs = {},
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super("niployments:k8s:AppNamespace", name, {}, opts);

    this.name = name;

    this.namespace = new k8s.core.v1.Namespace(
      `${name}-namespace`,
      { metadata: { name } },
      {
        parent: this,

        ...(args.stateful ? guard() : {}),
      },
    );

    if (args.pullSecret) {
      this.pullSecret = new k8s.core.v1.Secret(
        `${name}-${pullSecretName}`,
        {
          metadata: { name: pullSecretName, namespace: name },
          type: "kubernetes.io/dockerconfigjson",
          stringData: { ".dockerconfigjson": dockerConfigJson() },
        },
        {
          parent: this,
          dependsOn: [this.namespace],
        },
      );
    }

    this.registerOutputs({ namespace: this.namespace });
  }
}
