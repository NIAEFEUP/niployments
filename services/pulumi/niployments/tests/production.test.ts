import { describe, it, before } from "node:test";
import * as assert from "node:assert/strict";
import { mockProgram, runProgram, type Registered } from "./support.js";

describe("production stack", () => {
  let resources: Registered[];
  let missingConfig: Set<string>;

  before(async () => {
    ({ resources, missingConfig } = mockProgram("production", {
      "niployments:adopt": "tests/adopt.fixture.json",
      "niployments:charts": {
        "kubernetes-replicator": "2.10.0",
        keel: "1.0.0",
        "nfs-subdir-external-provisioner": "4.0.18",
        "community-operator": "0.9.0",
        harbor: "1.14.0",
        loki: "6.0.0",
        "kube-prometheus": "60.0.0",
        valkey: "2.0.0",
        nextcloud: "6.0.0",
        minecraft: "0.1.0",
      },
    }));

    await runProgram();
    // let the outputs of the mocks settle
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  const k8sObjects = () =>
    resources.filter(
      (resource) =>
        // typed custom resources come from the generated `crds` extension SDK
        (resource.type.startsWith("kubernetes:") ||
          resource.type.startsWith("crds:")) &&
        !resource.type.includes(":yaml/") &&
        !resource.type.includes("Provider"),
    );

  it("deploys every service", () => {
    const releases = resources
      .filter((resource) => resource.type === "kubernetes:helm.sh/v3:Release")
      .map((resource) => resource.inputs.name);

    for (const release of [
      "cert-manager",
      "traefik",
      "longhorn",
      "harbor",
      "kube-prometheus",
      "loki",
      "valkey",
      "pgadmin4",
      "nextcloud",
      "minecraft",
      "external-dns",
    ]) {
      assert.ok(releases.includes(release), `missing release ${release}`);
    }
  });

  it("names every object explicitly", () => {
    const unnamed = k8sObjects()
      .filter((resource) => resource.type !== "kubernetes:helm.sh/v3:Release")
      .filter(
        (resource) =>
          (resource.inputs.metadata as { name?: unknown } | undefined)?.name ===
          undefined,
      )
      .map((resource) => `${resource.type} ${resource.name}`);

    assert.deepEqual(unnamed, []);
  });

  it("imports only the objects of the inventory", () => {
    const imported = k8sObjects()
      .filter((resource) => resource.id)
      .map((resource) => `${resource.type.split(":").pop()} ${resource.id}`)
      .sort();

    assert.deepEqual(imported, [
      "Certificate website-ae/website-ae-cert",
      "Cluster pg/cnpg-cluster",
      "Deployment website-ae/website-ae",
      "IngressRoute website-ae/website-ae-https",
      "Namespace cert-manager",
      "Namespace website-ae",
      "Release cert-manager/cert-manager",
      "Release kube-system/traefik",
      "Service website-ae/website-ae-service",
    ]);
  });

  it("keeps the CNPG roles in the order of the live cluster", () => {
    const cluster = resources.find(
      (resource) => resource.name === "cnpg-cluster",
    );
    assert.ok(cluster, "the CNPG cluster is declared");

    const { spec } = cluster.inputs as {
      spec: { managed: { roles: { name: string }[] } };
    };
    const roles = spec.managed.roles.map((role) => role.name);

    assert.deepEqual(roles, [
      "ni",
      "plausible",
      "sinf-website-2023",
      "tts",
      "tts-staging",
      "website-ae",
      "teup",
      "inicio",
      "inicio-staging",
    ]);
  });

  it("reports the config it needs", () => {
    console.log(
      `Config keys required by production:\n${[...missingConfig].sort().join("\n")}`,
    );
    assert.ok(missingConfig.size > 0);
  });
});
