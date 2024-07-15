import { concat, PulumiInputify } from "../../utils/pulumi";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as crds from "#crds";
import { replicateTo } from "../../utils/replicator";
import { CommitSignal, PendingValue } from "../../utils/pending";
import { DBUser, MongoDBCommunityControllerArgs } from "./types";

const namespace = new k8s.core.v1.Namespace("mongodb-namespace", {
  metadata: {
    name: "mongodb",
  },
});

const chartCrds = new k8s.yaml.v2.ConfigFile(
  "mongodb-community-operator-crds",
  {
    skipAwait: true,
    file: "https://raw.githubusercontent.com/limwa/mongodb-kubernetes-operator/master/config/crd/bases/mongodbcommunity.mongodb.com_mongodbcommunity.yaml",
  },
);

const chart = new k8s.helm.v4.Chart(
  "mongodb-community-operator-chart",
  {
    chart: "community-operator",
    namespace: namespace.metadata.name,
    skipAwait: true,
    // CRDs are installed above
    skipCrds: true,
    valueYamlFiles: [
      new pulumi.asset.FileAsset("./assets/mongodb/values.yaml"),
    ],
    repositoryOpts: {
      repo: "https://mongodb.github.io/helm-charts",
    },
  },
  { dependsOn: [chartCrds] },
);

export class MongoDBCommunityController<
  const DB extends string,
> extends pulumi.ComponentResource<void> {
  private name;
  private namespace;
  public readonly dbs;

  private users;

  constructor(
    name: string,
    args: MongoDBCommunityControllerArgs<DB>,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    const users = new PendingValue<
      pulumi.Input<crds.types.input.mongodbcommunity.v1.MongoDBCommunitySpecUsersArgs>[]
    >([]);

    super(
      "niployments:mongodb:MongoDBCommunityController",
      name,
      { commitSignal: users.commit },
      opts,
    );

    this.name = name;
    this.namespace = args?.namespace ?? namespace.metadata.name;
    this.dbs = args.dbs;

    this.users = users;

    this.createOperator(args);
  }

  protected initialize({
    commitSignal,
  }: {
    commitSignal: CommitSignal;
  }): Promise<void> {
    commitSignal.resource = this;
    return commitSignal.waitForCommit();
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
          users: this.users.asOutput(),
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
      { parent: this, dependsOn: [chart], deletedWith: chart },
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
        }) satisfies crds.types.input.mongodbcommunity.v1.MongoDBCommunitySpecUsersArgs,
    );

    this.users.run((users) => users.push(userSpec));

    return this;
  }
}
