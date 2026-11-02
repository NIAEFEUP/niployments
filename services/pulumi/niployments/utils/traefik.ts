import * as pulumi from "@pulumi/pulumi";
import * as crds from "@pulumi/crds";
import { traefik } from "#platform/traefik.js";

/** A Traefik rule matching any of the given hosts, optionally restricted to a path prefix. */
export function hostRule(hosts: string[], pathPrefix?: string) {
  const rule = hosts.map((host) => `Host(\`${host}\`)`).join(" || ");
  if (pathPrefix === undefined) return rule;

  const wrapped = hosts.length > 1 ? `(${rule})` : rule;
  return `${wrapped} && PathPrefix(\`${pathPrefix}\`)`;
}

/** A route target that answers directly from Traefik (used for redirects). */
export const noopService = {
  kind: "TraefikService",
  name: "noop@internal",
} as const;

export function stripPrefix(
  namespace: string,
  name: string,
  prefixes: string[],
  opts?: { forceSlash?: boolean; dependsOn?: pulumi.Resource[] },
) {
  return new crds.traefik.v1alpha1.Middleware(
    `${namespace}-${name}`,
    {
      metadata: { name, namespace },
      spec: { stripPrefix: { prefixes, forceSlash: opts?.forceSlash } },
    },
    {
      dependsOn: [traefik().release, ...(opts?.dependsOn ?? [])],
    },
  );
}
