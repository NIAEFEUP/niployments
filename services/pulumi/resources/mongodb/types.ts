import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as crds from "#crds";
import { PulumiInputify } from "../../utils/pulumi";

type DBRole =
  // Database user roles
  | "read"
  | "readWrite"
  // Database administration roles
  | "dbAdmin"
  | "dbOwner"
  | "userAdmin"
  // Cluster administration roles
  | "clusterAdmin"
  | "clusterManager"
  | "clusterMonitor"
  | "enableSharding"
  | "hostManager"
  // Backup and restoration roles
  | "backup"
  | "restore"
  // All database roles
  | "readAnyDatabase"
  | "readWriteAnyDatabase"
  | "userAdminAnyDatabase"
  | "dbAdminAnyDatabase"
  // Superuser roles
  | "root"
  // User-defined roles
  | (string & {});

export type DBUser<DB extends string> = { name: string } & PulumiInputify<{
  db: DB;
  password: string;
  connectionStringSecretNamespace?: string;
  connectionStringSecretName?: string;
  roles: {
    name: DBRole;
    db: DB;
  }[];
}>;

export type MongoDBCommunityControllerArgs<DB extends string> = {
  dbs: readonly DB[];
  namespace?: pulumi.Input<string>;
  mdbc?: {
    metadata?: Omit<k8s.types.input.meta.v1.ObjectMeta, "namespace">;
    spec?: Omit<
      crds.types.input.mongodbcommunity.v1.MongoDBCommunitySpecArgs,
      "users"
    >;
  };
};
