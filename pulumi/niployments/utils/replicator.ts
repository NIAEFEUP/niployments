import * as pulumi from "@pulumi/pulumi";
import { chart } from "#resources/replicator/charts.js";

export function replicateTo<const T extends string>(name: pulumi.Input<T>) {
  // chart.resources is used to create an implicit dependency
  // between the chart and the consumers of this value
  return pulumi
    .output(chart.resources)
    .apply(() => ({ "replicator.v1.mittwald.de/replicate-to": name }) as const);
}
