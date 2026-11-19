import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { Prefixer } from "#utils/prefixer.js";

export class TTSFrontend extends pulumi.ComponentResource {
  public readonly name: pulumi.Output<string>;
  public readonly port = pulumi.output(80);

  constructor(
    name: string,
    args: {
      namespace: pulumi.Input<string>;
      branch: pulumi.Input<"main" | "develop">;
    },
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super("niployments:tts:TTSFrontend", name, opts);

    const prefixer = new Prefixer(name);

    const frontendLabels = { app: "tts-frontend" };
    const frontendPort = 80;

    const deployment = new k8s.apps.v1.Deployment(
      prefixer.deployment(),
      {
        metadata: {
          namespace: args.namespace,
          annotations: {
            "keel.sh/policy": "force",
            "keel.sh/match-tag": "true",
          },
        },
        spec: {
          replicas: 1,
          selector: {
            matchLabels: frontendLabels,
          },
          template: {
            metadata: {
              labels: frontendLabels,
            },
            spec: {
              containers: [
                {
                  name: "tts-fe",
                  image: pulumi.interpolate`registry.niaefeup.pt/niaefeup/tts-fe:${args.branch}`,
                  imagePullPolicy: "Always",
                  resources: {
                    limits: {
                      memory: "128Mi",
                      cpu: "500m",
                    },
                  },
                  ports: [
                    {
                      containerPort: frontendPort,
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
              targetPort: frontendPort,
            },
          ],
          selector: frontendLabels,
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
