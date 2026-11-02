import * as pulumi from "@pulumi/pulumi";

export const registryHost = "registry.niaefeup.pt";
export const pullSecretName = "harbor-pull-secret";

/**
 * Contents of a `kubernetes.io/dockerconfigjson` secret for the Harbor registry.
 * Credentials come from `registry/username` and `registry/password` in the stack config.
 */
export function dockerConfigJson() {
  const config = new pulumi.Config();

  return pulumi
    .all([
      config.requireSecret("registry/username"),
      config.requireSecret("registry/password"),
    ])
    .apply(([username, password]) =>
      JSON.stringify({
        auths: {
          [registryHost]: {
            auth: Buffer.from(`${username}:${password}`).toString("base64"),
          },
        },
      }),
    );
}

/** The `image` of a repository inside our Harbor registry. */
export function image(repository: string, tag: pulumi.Input<string>) {
  return pulumi.interpolate`${registryHost}/${repository}:${tag}`;
}
