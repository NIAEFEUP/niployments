import * as k8s from "@pulumi/kubernetes";
import { lazy } from "#utils/lazy.js";

const version = "1.23.2";

/**
 * The CloudNativePG operator, installed from the release manifest
 * (it creates the `cnpg-system` namespace and its own CRDs).
 */
export const cnpgOperator = lazy(
  () =>
    // PHASE0: it was applied with `kubectl apply --server-side`, check that every object is adopted
    new k8s.yaml.v2.ConfigFile("cnpg-operator", {
      file: `https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.23/releases/cnpg-${version}.yaml`,
      skipAwait: true,
    }),
);
