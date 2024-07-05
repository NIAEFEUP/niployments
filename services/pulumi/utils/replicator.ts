import * as pulumi from "@pulumi/pulumi";

export function replicateTo(name: pulumi.Input<string>) {
    return pulumi.output(name).apply(name => ({ "replicator.v1.mittwald.de/replicate-to": name }) as const);
}
