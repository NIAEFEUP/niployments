import * as fs from "node:fs";
import * as pulumi from "@pulumi/pulumi";
import { isProduction } from "#config";

type GuardOptions = Pick<
  pulumi.CustomResourceOptions,
  "protect" | "retainOnDelete"
>;

/**
 * Resource options for resources that must never be deleted by accident.
 * Only applied in production, so that development stacks can still be destroyed.
 */
export function guard(): GuardOptions {
  return isProduction ? { protect: true, retainOnDelete: true } : {};
}

type Metadata = { name?: unknown; namespace?: unknown } | undefined;

/** The key of an object in the inventory: `Kind:namespace/name` (or `Kind:name` if cluster-scoped). */
function inventoryKey(type: string, props: pulumi.Inputs) {
  const kind = type.split(":").pop();

  if (type === "kubernetes:helm.sh/v3:Release") {
    const { name, namespace } = props as {
      name?: unknown;
      namespace?: unknown;
    };
    return typeof name === "string" && typeof namespace === "string"
      ? `${kind}:${namespace}/${name}`
      : undefined;
  }

  const metadata = props.metadata as Metadata;
  if (typeof metadata?.name !== "string") return undefined;

  return typeof metadata.namespace === "string"
    ? `${kind}:${metadata.namespace}/${metadata.name}`
    : `${kind}:${metadata.name}`;
}

/**
 * Adopts the objects that already run in the cluster instead of creating them.
 *
 * `niployments:adopt` is the path of a JSON array with the objects that exist
 * (`Kind:namespace/name`, `Kind:name` for cluster-scoped objects and
 * `Release:namespace/name` for Helm releases), generated from the live cluster by
 * `scripts/adopt-inventory.sh`. Every declared object listed there is registered with the
 * `import` option; everything else is created as usual.
 *
 * Must be called before any resource is declared.
 */
export function adoptFromInventory(path: string | undefined) {
  if (path === undefined) return new Set<string>();

  const inventory = new Set(
    JSON.parse(fs.readFileSync(path, "utf8")) as string[],
  );

  // The SDK-side transformation is used (and not registerResourceTransform) so that it also
  // applies under the mocks of the tests.
  pulumi.runtime.registerStackTransformation((args) => {
    const opts = args.opts as pulumi.CustomResourceOptions;
    if (!(args.resource instanceof pulumi.CustomResource)) return undefined;
    if (opts.import !== undefined) return undefined;

    const key = inventoryKey(args.type, args.props);
    if (key === undefined || !inventory.has(key)) return undefined;

    const id = key.slice(key.indexOf(":") + 1);
    return { props: args.props, opts: { ...opts, import: id } };
  });

  return inventory;
}
