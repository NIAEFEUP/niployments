import * as pulumi from "@pulumi/pulumi";
import { replicator } from "#platform/replicator.js";

export function replicateTo<const T extends string>(name: pulumi.Input<T>) {
  // release.resourceNames is used to create an implicit dependency
  // between the chart and the consumers of this value
  return pulumi
    .output(replicator().release.resourceNames)
    .apply(() => ({ "replicator.v1.mittwald.de/replicate-to": name }) as const);
}
