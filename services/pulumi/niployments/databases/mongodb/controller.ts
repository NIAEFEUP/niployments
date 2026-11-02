import { concat } from "#utils/pulumi.js";
import { onFinalize } from "#utils/finalize.js";
import { guard } from "#utils/adopt.js";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { mongodbOperator } from "./operator.js";
import * as crds from "@pulumi/crds";
import { replicateTo } from "#utils/replicator.js";
import type { DBUser, MongoDBCommunityControllerArgs } from "./types.js";

export class MongoDBCommunityController<const DB extends string>
  extends pulumi.ComponentResource
{
  private name;
  private namespace;
  public readonly dbs;

  private users: pulumi.Input<crds.types.input.mongodbcommunity.v1.MongoDBCommunitySpecUsers>[] =
    [];

  constructor(
    name: string,
    args: MongoDBCommunityControllerArgs<DB>,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super("niployments:mongodb:MongoDBCommunityController", name, {}, opts);

    this.name = name;
    this.namespace = args?.namespace ?? "mongodb";
    this.dbs = args.dbs;

    onFinalize(() => this.createOperator(args));
  }

  private provideDefaultMdbcArgs(args: MongoDBCommunityControllerArgs<DB>) {
    return {
      metadata: concat([
        {
          namespace: this.namespace,
        },
        args.mdbc?.metadata ?? {},
      ]),
      spec: concat([
        {
          type: "ReplicaSet",
          security: concat([
            {
              authentication: {
                modes: ["SCRAM"],
              },
            },
            args.mdbc?.spec?.security ?? {},
          ]),
          users: this.users,
        },
        args.mdbc?.spec ?? {},
      ]),
    } satisfies crds.mongodbcommunity.v1.MongoDBCommunityArgs;
  }

  private createOperator(args: MongoDBCommunityControllerArgs<DB>) {
    const mdbcArgs = this.provideDefaultMdbcArgs(args);

    const operatorName = `${this.name}-operator`;
    return new crds.mongodbcommunity.v1.MongoDBCommunity(
      operatorName,
      mdbcArgs,
      {
        parent: this,
        dependsOn: [mongodbOperator().release],
        deletedWith: mongodbOperator().release,

        ...guard(),
      },
    );
  }

  private createCredentialsSecret(
    username: string,
    password: pulumi.Input<string>,
  ) {
    const credentialsSecretName = `${this.name}-${username}-credentials`;
    const credentialsSecret = new k8s.core.v1.Secret(
      credentialsSecretName,
      {
        metadata: {
          namespace: this.namespace,
          name: credentialsSecretName,
        },
        stringData: {
          password: password,
        },
      },
      { parent: this },
    );

    return credentialsSecret;
  }

  public addUser(user: DBUser<DB>) {
    const resolvedUser = pulumi.output(user);

    const credentialsSecret = this.createCredentialsSecret(
      user.name,
      resolvedUser.password,
    );

    const userSpec = resolvedUser.apply(
      (resolvedUser) =>
        ({
          name: user.name,
          db: resolvedUser.db,
          roles: resolvedUser.roles,
          connectionStringSecretName: resolvedUser.connectionStringSecretName,
          connectionStringSecretAnnotations: concat([
            (resolvedUser.connectionStringSecretNamespace &&
              replicateTo(resolvedUser.connectionStringSecretNamespace)) ||
              undefined,
          ]),
          passwordSecretRef: {
            name: credentialsSecret.metadata.name,
          },
          scramCredentialsSecretName: `${this.name}-${user.name}`,
        }) satisfies crds.types.input.mongodbcommunity.v1.MongoDBCommunitySpecUsers,
    );

    this.users.push(userSpec);

    return this;
  }
}
