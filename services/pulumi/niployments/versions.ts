import * as pulumi from "@pulumi/pulumi";
import { isProduction } from "#config";

/**
 * Chart versions that were pinned by the old deploy scripts.
 * Everything else MUST be pinned per stack with
 * `pulumi config set --path 'charts.<name>' <version>` before production can be previewed,
 * so that adopting a live Helm release never silently upgrades it.
 */
const defaults: Record<string, string | undefined> = {
  traefik: "25.0.0",
  "cert-manager": "v1.14.7",
  longhorn: "1.6.1",
  "external-dns": "1.14.3",
  pgadmin4: "1.62.0",
  podinfo: "6.14.0",
};

const config = new pulumi.Config();

export function chartVersion(name: string): string | undefined {
  const overrides = config.getObject<Record<string, string>>("charts") ?? {};

  const version = overrides[name] ?? defaults[name];
  if (version !== undefined || !isProduction) return version;

  throw new Error(
    `The version of the "${name}" chart is not pinned. ` +
      `Set it to the live version with: pulumi config set --path 'niployments:charts.${name}' <version>`,
  );
}
