import * as pulumi from "@pulumi/pulumi";

type RecursivePulumiInput<T> = 
    T extends object
        ? pulumi.Input<{ [K in keyof T]: RecursivePulumiInput<T[K]> }>
        : T extends undefined
            ? undefined
            : pulumi.Input<T>;

type X = RecursivePulumiInput<string | undefined>;

export type PulumiInputify<T> = RecursivePulumiInput<pulumi.Unwrap<T>>;

export function applyInDeployment<Input, Output>(value: pulumi.Output<Input>, inDryRun: pulumi.Input<Output>, inDeployment: (value: Input) => pulumi.Input<Output>) {
    return value.apply((value) => pulumi.output(pulumi.runtime.isDryRun() ? inDryRun : inDeployment(value)));
}
