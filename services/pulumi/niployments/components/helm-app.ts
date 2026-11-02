import * as fs from "node:fs";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { env } from "#config";
import { chartVersion } from "../versions.js";
import { guard } from "#utils/adopt.js";

export type HelmAppArgs = {
  /** Namespace of the release. It must already exist, unless `createNamespace` is set. */
  namespace: string;
  /** Name of the release (defaults to the name of the chart). */
  releaseName?: string;
  chart: string;
  /** URL of the Helm repository. Omit it for OCI charts and local paths. */
  repo?: string;
  /** Overrides the key used to look up the pinned version (defaults to the release name). */
  versionKey?: string;
  /** Directory inside `assets/` holding `values.yaml` and optionally `values.<stack>.yaml`. */
  assets?: string;
  /** Extra values, applied on top of the value files. Use this for secrets. */
  values?: pulumi.Input<Record<string, pulumi.Input<unknown>>>;
  createNamespace?: boolean;
  skipCrds?: boolean;
  skipAwait?: boolean;
  timeout?: number;
  dependsOn?: pulumi.Input<pulumi.Resource>[];
  /** Protects the release from deletion (stateful services). */
  stateful?: boolean;
};

function valueFiles(assets: string) {
  const candidates = ["values.yaml", `values.${env}.yaml`];

  return candidates
    .filter((file) => fs.existsSync(`./assets/${assets}/${file}`))
    .map((file) => new pulumi.asset.FileAsset(`./assets/${assets}/${file}`));
}

/**
 * A Helm release, pinned to a version and configured through `assets/<name>/values*.yaml`.
 */
export class HelmApp extends pulumi.ComponentResource {
  public readonly release: k8s.helm.v3.Release;

  constructor(
    name: string,
    args: HelmAppArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super("niployments:helm:HelmApp", name, {}, opts);

    const releaseName =
      args.releaseName ?? args.chart.split("/").pop() ?? args.chart;

    this.release = new k8s.helm.v3.Release(
      name,
      {
        name: releaseName,
        chart: args.chart,
        version: chartVersion(args.versionKey ?? releaseName),
        namespace: args.namespace,
        createNamespace: args.createNamespace,
        repositoryOpts: args.repo ? { repo: args.repo } : undefined,
        valueYamlFiles: args.assets ? valueFiles(args.assets) : [],
        values: args.values,
        skipCrds: args.skipCrds,
        skipAwait: args.skipAwait,
        timeout: args.timeout,
      },
      {
        parent: this,
        dependsOn: args.dependsOn,

        ...(args.stateful ? guard() : {}),
      },
    );

    this.registerOutputs({ release: this.release });
  }
}
