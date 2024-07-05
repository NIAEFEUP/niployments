import { concat, PulumiInputify } from "../utils/pulumi";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as crds from "#crds";
import { replicateTo } from "../utils/replicator";

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
  connectionStringSecretNamespace?: string;
  connectionStringSecretName?: string;
  roles: {
    name: Role;
    db: Databases;
  }[];
}>;

type Args<Databases extends string> = {
  dbs: readonly Databases[];
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
  private committed = false;

  private users: pulumi.Input<crds.types.input.mongodbcommunity.v1.MongoDBCommunitySpecUsersArgs>[] =
    [];

  private operatorDependsOn: pulumi.Input<pulumi.Resource | undefined>[] = [];

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

    const definedOperatorDependsOn = pulumi.output(this.commitAction.promise.then(() => {
      const definedDeps = pulumi.output(this.operatorDependsOn).apply((deps) => deps.filter(pulumi.Resource.isInstance));
      return definedDeps;
  }).catch(() => pulumi.output([])));

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
      { parent: this, dependsOn: definedOperatorDependsOn }
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
      pulumi.log.warn(
        "MongoDBCommunityController has already been committed. This may cause some users to not be properly added to the replica set.",
        this
      );
    }

    this.committed = true;
    this.commitAction.resolve();
  }

  public addUser(user: User<Databases>) {
    const resolvedUser = pulumi.output(user);

    const credentialsSecretName = `${this.name}-${user.name}-credentials`;
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

    const userSpec = resolvedUser.apply(
      (resolvedUser) =>
        ({
          name: user.name,
          db: resolvedUser.db,
          // pulumi doesn't like (string & {}) for autocomplete, so we have to cast it
          roles:
            resolvedUser.roles as crds.types.input.mongodbcommunity.v1.MongoDBCommunitySpecUsersRolesArgs[],
          connectionStringSecretName:
            resolvedUser.connectionStringSecretName,
          connectionStringSecretAnnotations: resolvedUser.connectionStringSecretNamespace && concat([
            replicateTo(resolvedUser.connectionStringSecretNamespace),
          ]) || undefined,
          passwordSecretRef: {
            name: credentialsSecret.metadata.name,
          },
          scramCredentialsSecretName: `${this.name}-${user.name}`,
        } satisfies crds.types.input.mongodbcommunity.v1.MongoDBCommunitySpecUsersArgs)
    );

    this.users.push(userSpec);

    return this;
  }
}
