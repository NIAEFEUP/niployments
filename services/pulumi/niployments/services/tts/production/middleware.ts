import { namespace } from "./namespace.js";
import { prefixer } from "./prefixer.js";
import * as pulumi from "@pulumi/pulumi";
import * as crds from "@pulumi/crds";
import { ensureOutputIsDefined } from "#utils/pulumi.js";

const stripApiPrefixMiddleware = new crds.traefik.v1alpha1.Middleware(
  prefixer.create("strip-api-prefix"),
  {
    metadata: {
      namespace: namespace.metadata.name,
    },
    spec: {
      stripPrefix: {
        prefixes: ["/api"],
        forceSlash: false,
      },
    },
  },
);

export const stripApiPrefix = {
  name: pulumi.output(
    ensureOutputIsDefined(stripApiPrefixMiddleware.metadata.name),
  ),
};

const redirectToPrimaryAddressMiddleware = new crds.traefik.v1alpha1.Middleware(
  prefixer.create("redirect-to-primary-address"),
  {
    metadata: {
      namespace: namespace.metadata.name,
    },
    spec: {
      redirectRegex: {
        regex: "^https://ni.fe.up.pt/tts/(.*)",
        replacement: "https://tts.niaefeup.pt/$1",
        permanent: false,
      },
    },
  },
);

export const redirectToPrimaryAddress = {
  name: pulumi.output(
    ensureOutputIsDefined(redirectToPrimaryAddressMiddleware.metadata.name),
  ),
};
