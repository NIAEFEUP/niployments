import { PulumiInputify } from "#utils/pulumi.js";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as crds from "#crds";

type Role =
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

type User<Databases extends string> = { name: string } & PulumiInputify<{
  db: Databases;
  password: string;
  connectionStringSecretMetadata?: {
    namespace?: string;
    name?: string;
  };
  roles: {
    name: Role;
    db: Databases;
  }[];
}>;

type Args<Databases extends string> = {
  readonly dbs: Databases[];
  namespace?: pulumi.Input<string>;
  mdbc?: {
    metadata?: Omit<k8s.types.input.meta.v1.ObjectMeta, "namespace">;
    spec?: Omit<
      crds.types.input.mongodbcommunity.v1.MongoDBCommunitySpecArgs,
      "users"
    >;
  };
};

export class MongoDBCommunityController<
  const Databases extends string
> extends pulumi.ComponentResource<{}> {
  private name: string;
  private namespace: pulumi.Input<string> | undefined;
  private commitAction: PromiseWithResolvers<void>;
  private committed: boolean = false;

  private users: pulumi.Input<crds.types.input.mongodbcommunity.v1.MongoDBCommunitySpecUsersArgs>[] =
    [];

  constructor(
    name: string,
    args: Args<Databases>,
    opts?: pulumi.ComponentResourceOptions
  ) {
    const commitAction = Promise.withResolvers<void>();
    super(
      "niployments:mongodb:MongoDBCommunityController",
      name,
      { commit: commitAction.promise },
      opts
    );

    this.name = name;
    this.namespace = args?.namespace;
    this.commitAction = commitAction;

    const operatorName = `${this.name}-operator`;
    new crds.mongodbcommunity.v1.MongoDBCommunity(
      operatorName,
      {
        metadata: {
          ...args.mdbc?.metadata,
          namespace: args?.namespace,
        },
        spec: args.mdbc?.spec && {
          ...args.mdbc?.spec,
          users: pulumi.output(
            this.commitAction.promise.then(() => this.users)
          ),
        },
      },
      { parent: this }
    );
  }

  protected async initialize({
    commit,
  }: {
    commit: Promise<void>;
  }): Promise<{}> {
    await commit;
    return {};
  }

  public commit() {
    if (this.committed) {
      pulumi.log.warn("MongoDBCommunityController has already been committed. This may cause some users to not be properly added to the replica set.", this);
    }
    
    this.committed = true;
    this.commitAction.resolve();
  }

  public addUser(user: User<Databases>) {
    const resolvedUser = pulumi.output(user);

    const credentialsSecretName = `${this.name}-${user.name}-credentials-secret`;
    const credentialsSecret = new k8s.core.v1.Secret(
      credentialsSecretName,
      {
        metadata: {
          namespace: this.namespace,
          name: credentialsSecretName,
        },
        stringData: {
          password: resolvedUser.password,
        },
      },
      { parent: this }
    );

    const userSpec = resolvedUser.apply((resolvedUser) => ({
      name: user.name,
      db: resolvedUser.db,
      // pulumi doesn't like (string & {}) for autocomplete, so we have to cast it
      roles: resolvedUser.roles as crds.types.input.mongodbcommunity.v1.MongoDBCommunitySpecUsersRolesArgs[],
      connectionStringSecretName: resolvedUser.connectionStringSecretMetadata?.name,
      connectionStringSecretNamespace: resolvedUser.connectionStringSecretMetadata?.namespace,
      passwordSecretRef: {
        name: credentialsSecret.metadata.name,
      },
      scramCredentialsSecretName: `${this.name}-${user.name}-scram-credentials-secret`,
    }) satisfies crds.types.input.mongodbcommunity.v1.MongoDBCommunitySpecUsersArgs);

    this.users.push(userSpec);

    return this;
  }
}

const db = new MongoDBCommunityController("mongodb", {
  dbs: ["admin", "nimentas", "fkjkhgkdjf"],
  namespace: "mongodb",
  mdbc: {
    spec: {
      type: "ReplicaSet",
      members: 3,
      version: "6.0.5",
      security: {
        authentication: {
          modes: ["SCRAM"],
        },
      },
      additionalMongodConfig: {
        "storage.wiredTiger.engineConfig.journalCompressor": "zlib",
      },
      statefulSet: {
        spec: {
          volumeClaimTemplates: [
            {
              metadata: {
                name: "data-volume",
              },
              spec: {
                accessModes: ["ReadWriteOnce"],
                resources: {
                  requests: {
                    storage: "5Gi",
                  },
                },
              },
            },
          ],
        },
      },
    },
  },
});

db.addUser({
  name: "ni",
  db: "admin",
  password: "pass",
  roles: [
    {
      db: "admin",
      name: "root",
    },
  ],
}).commit();

db.commit();
