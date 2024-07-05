import * as pulumi from "@pulumi/pulumi";
import { CommitSignal } from "./pending";

type RecursivePulumiInput<T> = 
    T extends object
        ? pulumi.Input<{ [K in keyof T]: RecursivePulumiInput<T[K]> }>
        : T extends undefined
            ? undefined
            : pulumi.Input<T>;

export type PulumiInputify<T> = RecursivePulumiInput<pulumi.Unwrap<T>>;

export function applyInDeployment<Input, Output>(value: pulumi.Output<Input>, inDryRun: pulumi.Input<Output>, inDeployment: (value: Input) => pulumi.Input<Output>) {
    return value.apply((value) => pulumi.output(pulumi.runtime.isDryRun() ? inDryRun : inDeployment(value)));
}

type MergeObjects<Base extends Record<string, any>, Overrides extends Record<string, any>> = Omit<Base, keyof Overrides> & Overrides;

type FlattenArrayIntoObject<T extends readonly pulumi.Inputs[]> =
    T extends readonly [infer First extends pulumi.Inputs, ...infer Rest extends readonly pulumi.Inputs[]]
        ? MergeObjects<First, FlattenArrayIntoObject<Rest>>
        : {};

export function concat<const T extends pulumi.Input<readonly pulumi.Input<pulumi.Inputs>[]>>(values: T) {
    return pulumi.output(values)
        .apply(values => Object.assign({}, ...values) as FlattenArrayIntoObject<pulumi.Unwrap<T>>)
        .apply(val => structuredClone(val)); // structuredClone is needed to ensure values remains readonly
}
