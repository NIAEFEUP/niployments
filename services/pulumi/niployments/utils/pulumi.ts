import * as pulumi from "@pulumi/pulumi";

type RecursivePulumiInput<T> = T extends object
  ? T extends string & {}
    ? pulumi.Input<string>
    : pulumi.Input<{ [K in keyof T]: RecursivePulumiInput<T[K]> }>
  : T extends undefined
    ? undefined
    : pulumi.Input<T>;

export type PulumiInputify<T> = RecursivePulumiInput<pulumi.Unwrap<T>>;

export function applyInDeployment<Input, Output>(
  value: pulumi.Output<Input>,
  inDryRun: pulumi.Input<Output>,
  inDeployment: (value: Input) => pulumi.Input<Output>,
) {
  return value.apply((value) =>
    pulumi.output(pulumi.runtime.isDryRun() ? inDryRun : inDeployment(value)),
  );
}

type MergeObjects<
  Base extends Record<string, unknown>,
  Overrides extends Record<string, unknown>,
> = Omit<Base, keyof Overrides> & Overrides;

type FindPossibleLists<T extends readonly (pulumi.Inputs | undefined)[]> =
  T extends readonly [
    infer First extends pulumi.Inputs | undefined,
    ...infer Rest extends readonly (pulumi.Inputs | undefined)[],
  ]
    ? First extends undefined
      ? FindPossibleLists<Rest>
      : [NonNullable<First>, ...FindPossibleLists<Rest>]
    : [];

type FlattenArrayIntoObject<T extends readonly pulumi.Inputs[]> =
  T extends readonly [
    infer First extends pulumi.Inputs,
    ...infer Rest extends readonly pulumi.Inputs[],
  ]
    ? MergeObjects<NonNullable<First>, FlattenArrayIntoObject<Rest>>
    : /* eslint-disable-next-line @typescript-eslint/no-empty-object-type --
       * T is empty array and flattening it produces an empty object
       */
      {};

export function concat<
  const T extends pulumi.Input<
    readonly pulumi.Input<pulumi.Inputs | undefined>[]
  >,
>(values: T) {
  return pulumi
    .output(values)
    .apply((values) => values.filter(Boolean))
    .apply(
      (values) =>
        Object.assign({}, ...values) as FlattenArrayIntoObject<
          FindPossibleLists<pulumi.Unwrap<T>>
        >,
    )
    .apply((val) => structuredClone(val)); // structuredClone is needed to ensure values remains readonly
}

export function ensureOutputIsDefined<T>(
  output: pulumi.Output<T | undefined> | undefined,
) {
  if (output == undefined) {
    throw new Error("output is undefined");
  }

  return output.apply((value) => {
    if (value == undefined) {
      throw new Error("output is undefined");
    }

    return value;
  });
}
