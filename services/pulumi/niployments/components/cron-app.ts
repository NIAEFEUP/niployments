import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { pullSecretName } from "#utils/registry.js";

export type CronAppArgs = {
  namespace: string;
  schedule: string;
  image: pulumi.Input<string>;
  command: string[];
  args: string[];
  /** Secret exposed as environment variables. */
  envFromSecret?: pulumi.Input<string>;
  /** Let Keel redeploy the CronJob whenever its image tag is pushed. */
  keel?: boolean;
};

/**
 * A CronJob running a single container from our registry.
 */
export class CronApp extends pulumi.ComponentResource {
  public readonly cronJob: k8s.batch.v1.CronJob;

  constructor(
    name: string,
    args: CronAppArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super("niployments:k8s:CronApp", `${args.namespace}-${name}`, {}, opts);

    const keel = { "keel.sh/policy": "force" };

    this.cronJob = new k8s.batch.v1.CronJob(
      `${args.namespace}-${name}`,
      {
        metadata: {
          name,
          namespace: args.namespace,
          annotations: args.keel
            ? { ...keel, "keel.sh/match-tag": "true" }
            : undefined,
        },
        spec: {
          schedule: args.schedule,
          jobTemplate: {
            spec: {
              template: {
                metadata: { annotations: args.keel ? keel : undefined },
                spec: {
                  containers: [
                    {
                      name: "runner",
                      image: args.image,
                      imagePullPolicy: "Always",
                      command: args.command,
                      args: args.args,
                      envFrom: args.envFromSecret
                        ? [{ secretRef: { name: args.envFromSecret } }]
                        : undefined,
                    },
                  ],
                  restartPolicy: "OnFailure",
                  imagePullSecrets: [{ name: pullSecretName }],
                },
              },
            },
          },
        },
      },
      { parent: this },
    );

    this.registerOutputs({ cronJob: this.cronJob });
  }
}
