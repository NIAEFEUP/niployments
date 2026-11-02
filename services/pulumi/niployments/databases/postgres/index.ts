import * as pulumi from "@pulumi/pulumi";
import { lazy } from "#utils/lazy.js";
import { PostgresCluster } from "./cluster.js";

/** Reads the password of an app's role from the stack config (`postgres/<role>-password`). */
export function rolePassword(role: string) {
  return new pulumi.Config().requireSecret(`postgres/${role}-password`);
}

/**
 * The shared PostgreSQL cluster. Apps add their own role with `postgres().addRole(...)`.
 */
export const postgres = lazy(() => {
  const cluster = new PostgresCluster("postgres");

  cluster.addRole({
    name: "ni",
    superuser: true,
    password: rolePassword("ni"),
  });

  // Roles whose apps are not (yet) deployed from this repository
  cluster.addRole({
    name: "sinf-website-2023",
    password: rolePassword("sinf-website-2023"),
  });
  cluster.addRole({ name: "website-ae", password: rolePassword("website-ae") });

  return cluster;
});
