import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { Prefixer } from "#utils/prefixer.js";

export class TTSBackend extends pulumi.ComponentResource {
  public readonly name: pulumi.Output<string>;
  public readonly port = pulumi.output(80);

  constructor(
    name: string,
    args: {
      namespace: pulumi.Input<string>;
      branch: pulumi.Input<"main" | "develop">;
      envSecretRef: pulumi.Input<string>;
    },
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super("niployments:tts:TTSBackend", name, opts);

    const prefixer = new Prefixer(name);

    const backendLabels = { app: "tts-backend" };
    const backendPort = 8000;

    const deployment = new k8s.apps.v1.Deployment(
      prefixer.deployment(),
      {
        metadata: {
          namespace: args.namespace,
        },
        spec: {
          replicas: 1,
          selector: {
            matchLabels: backendLabels,
          },
          template: {
            metadata: {
              labels: backendLabels,
            },
            spec: {
              containers: [
                {
                  name: "tts-be",
                  image: pulumi.interpolate`registry.niaefeup.pt/niaefeup/tts-be:${args.branch}`,
                  imagePullPolicy: "Always",
                  resources: {
                    limits: {
                      memory: "128Mi",
                      cpu: "500m",
                    },
                  },
                  ports: [
                    {
                      containerPort: backendPort,
                    },
                  ],
                  envFrom: [
                    {
                      secretRef: {
                        name: args.envSecretRef,
                      },
                    },
                  ],
                },
              ],
              imagePullSecrets: [
                {
                  name: "harbor-pull-secret",
                },
              ],
            },
          },
        },
      },
      { parent: this },
    );

    const service = new k8s.core.v1.Service(
      prefixer.service(),
      {
        metadata: {
          namespace: args.namespace,
        },
        spec: {
          ports: [
            {
              port: this.port,
              targetPort: backendPort,
            },
          ],
          selector: backendLabels,
        },
      },
      { parent: this, dependsOn: [deployment] },
    );

    this.name = service.metadata.name;

    this.registerOutputs({
      serviceName: this.name,
      servicePort: this.port,
    });
  }
}
