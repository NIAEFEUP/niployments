import { concat, PulumiInputify } from "../utils/pulumi";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as crds from "#crds";
import { replicateTo } from "../utils/replicator";
import { CommitSignal, PendingValue } from "../utils/pending";

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
> extends pulumi.ComponentResource<void> {
  private name;
  private namespace;

  public readonly commitSignal;
  private users;
  private operatorDependencies;

  constructor(
    name: string,
    args: Args<Databases>,
    opts?: pulumi.ComponentResourceOptions
  ) {
    const commitSignal = new CommitSignal({ rejectIfNotCommitted: true });
    super(
      "niployments:mongodb:MongoDBCommunityController",
      name,
      { commitSignal },
      opts
    );
    
    this.name = name;
    this.namespace = args?.namespace;

    this.commitSignal = commitSignal;
    this.users = new PendingValue<pulumi.Input<crds.types.input.mongodbcommunity.v1.MongoDBCommunitySpecUsersArgs>[]>([], { commitSignal });
    this.operatorDependencies = new PendingValue<pulumi.Input<pulumi.Resource | undefined>[]>([], { commitSignal });

    const dependsOn = this.operatorDependencies.asOutput()
      .apply((deps) => deps.filter(pulumi.Resource.isInstance));

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
          users: this.users.asOutput(),
        },
      },
      { parent: this, dependsOn }
    );
  }

  protected initialize({ commitSignal }: { commitSignal: CommitSignal }): Promise<void> {
    commitSignal.resource = this;
    return commitSignal.waitForCommit();
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

    this.users.run(users => users.push(userSpec));

    return this;
  }

  public addOperatorDependency(dependency: pulumi.Input<pulumi.Resource | undefined>) {
    return this.operatorDependencies.run(dependencies => dependencies.push(dependency));
  }
}
