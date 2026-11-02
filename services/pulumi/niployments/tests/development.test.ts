import { describe, it, before } from "node:test";
import * as assert from "node:assert/strict";
import { mockProgram, runProgram, type Registered } from "./support.js";

describe("development stack", () => {
  let resources: Registered[];

  before(async () => {
    ({ resources } = mockProgram("development", {
      "niployments:features": { inicio: true, tts: true, ementas: true },
    }));

    await runProgram();
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  it("uses a self-signed issuer", () => {
    const issuers = resources.filter((resource) =>
      resource.type.endsWith("ClusterIssuer"),
    );

    assert.equal(issuers.length, 1);
    assert.equal(issuers[0]?.name, "letsencrypt-production");
  });

  it("does not deploy Longhorn", () => {
    assert.ok(
      !resources.some(
        (resource) =>
          resource.type === "kubernetes:helm.sh/v3:Release" &&
          resource.inputs.name === "longhorn",
      ),
    );
  });

  it("uses local-path storage classes", () => {
    const classes = resources.filter((resource) =>
      resource.type.endsWith(":StorageClass"),
    );

    assert.equal(classes.length, 8);
    for (const storageClass of classes) {
      assert.equal(storageClass.inputs.provisioner, "rancher.io/local-path");
    }
  });

  it("deploys the helper apps and the enabled ones", () => {
    const names = resources.map((resource) => resource.name);

    assert.ok(names.includes("test-test-app"));
    assert.ok(names.includes("game-2048-game-2048"));
    assert.ok(names.includes("inicio-staging-inicio") === false);
    assert.ok(names.includes("inicio-inicio"));
  });

  it("never imports objects", () => {
    assert.ok(resources.every((resource) => !resource.id));
  });
});
