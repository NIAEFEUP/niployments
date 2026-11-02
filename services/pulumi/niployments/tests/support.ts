import * as pulumi from "@pulumi/pulumi";

export type Registered = {
  type: string;
  name: string;
  inputs: Record<string, unknown>;
  id: string | undefined;
};

/**
 * Runs the program against Pulumi's mocks, so the whole resource graph can be
 * built without a cluster. Must be called before importing anything else.
 *
 * Config that the stack does not provide is faked, and reported in `missingConfig`.
 */
export function mockProgram(
  stack: "development" | "production",
  config: Record<string, unknown>,
) {
  process.env.PULUMI_CONFIG = JSON.stringify(
    Object.fromEntries(
      Object.entries({ "niployments:env": stack, ...config }).map(
        ([key, value]) => [
          key,
          typeof value === "string" ? value : JSON.stringify(value),
        ],
      ),
    ),
  );

  const resources: Registered[] = [];
  const missingConfig = new Set<string>();

  const fake = (key: string) => {
    missingConfig.add(key);
    return key === "cilium/lb-pool"
      ? { start: "10.0.0.1", stop: "10.0.0.2" }
      : "fake";
  };

  const methods = [
    ["require", (key: string) => fake(key)],
    ["requireSecret", (key: string) => pulumi.secret(fake(key))],
    ["requireObject", (key: string) => fake(key)],
    [
      "requireSecretObject",
      (key: string) => {
        const value = fake(key);
        return pulumi.secret({
          [typeof value === "string" ? value : key]: key,
        });
      },
    ],
  ] as const;

  for (const [method, replacement] of methods) {
    const original = Reflect.get(pulumi.Config.prototype, method) as (
      this: pulumi.Config,
      key: string,
    ) => unknown;

    // oxlint-disable-next-line typescript/no-unsafe-member-access, typescript/no-explicit-any
    (pulumi.Config.prototype as any)[method] = function (
      this: pulumi.Config,
      key: string,
    ) {
      try {
        return original.call(this, key);
      } catch {
        return replacement(key);
      }
    };
  }

  void pulumi.runtime.setMocks(
    {
      newResource: (args) => {
        resources.push({
          type: args.type,
          name: args.name,
          inputs: args.inputs as Record<string, unknown>,
          id: args.id,
        });

        return { id: args.id ?? `${args.name}-id`, state: args.inputs };
      },
      call: (args) => args.inputs,
    },
    "niployments",
    stack,
    false,
  );

  return { resources, missingConfig };
}

/** Runs `index.ts` inside a stack, like `pulumi up` does. */
export async function runProgram() {
  await pulumi.runtime.runInPulumiStack(async () => {
    await import("../index.js");
  });
}
