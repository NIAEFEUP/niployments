import { PulumiInputify } from "#utils/pulumi.js";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as crds from "#crds";
import { resolve } from "path";

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
  | "root";
// User-defined roles
//   | (string & {});

type User<Databases extends string> = {
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
};

type Args<Databases extends string> = {
  readonly dbs: Databases[];
  metadata?: Omit<k8s.types.input.meta.v1.ObjectMeta, "name">;
  spec?: Omit<
    crds.types.input.mongodbcommunity.v1.MongoDBCommunitySpecArgs,
    "users"
  >;
};

export class MongoDBCommunity<
  const Databases extends string
> extends pulumi.ComponentResource<{}> {
  private name: string;
  private namespace: pulumi.Output<string | undefined>;
  private users: pulumi.Output<crds.types.input.mongodbcommunity.v1.MongoDBCommunitySpecUsersArgs>[];
  private secrets: k8s.core.v1.Secret[];

  private resourcePromise: Promise<void>;
  private resolveResourcePromise: () => void;

  constructor(
    name: string,
    args: Args<Databases>,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super("niployments:mongodb:MongoDBCommunity", name, {}, opts);

    this.name = name;
    this.users = [];
    this.secrets = [];
    
    this.resolveResourcePromise = () => { throw new Error("resolveResourcePromise not set") };
    this.resourcePromise = new Promise((resolve) => {
        this.resolveResourcePromise = resolve;
    });
    
    this.namespace = pulumi.output(args.metadata?.namespace);

    const operatorName = `${this.name}-operator`;
    new crds.mongodbcommunity.v1.MongoDBCommunity(
      operatorName,
      {
        metadata: {
          ...args.metadata,
          name: operatorName,
        },
        spec: args.spec && {
          ...args.spec,
          users: pulumi.output(this.resourcePromise.then(() => this.users)),
        },
      },
      { parent: this }
    );
  }

  protected async initialize(args: pulumi.Inputs): Promise<{}> {
      await this.resourcePromise;
      pulumi.log.error("MongoDBCommunity initialized");
      return {};
  }

  public addUser(name: string, user: PulumiInputify<User<Databases>>) {
    const resolvedUser = pulumi.output(user);

    const credentialsSecretName = `${this.name}-${name}-credentials-secret`;
    const credentialsSecret = new k8s.core.v1.Secret(
      credentialsSecretName,
      {
        metadata: this.namespace.apply((namespace) => ({
          namespace,
          name: credentialsSecretName,
        })),
        stringData: {
          password: resolvedUser.password,
        },
      },
      { parent: this }
    );

    this.secrets.push(credentialsSecret);

    this.users.push(
      pulumi.all([resolvedUser, credentialsSecret.metadata]).apply(([user, credentialsSecretMetadata]) => ({
        connectionStringSecretName: user.connectionStringSecretMetadata?.name,
        connectionStringSecretNamespace:
          user.connectionStringSecretMetadata?.namespace,
        db: user.db,
        name,
        passwordSecretRef: {
          name: credentialsSecretMetadata.name,
        },
        roles: user.roles,
        scramCredentialsSecretName: `${this.name}-${name}-scram-credentials-secret`,
      }))
    );
  }

  public finish() {
    pulumi.log.error("MongoDBCommunity finishing");
    this.resolveResourcePromise();
  }
}


const db = new MongoDBCommunity("mongodb", {
  dbs: ["admin", "nimentas", "fkjkhgkdjf"],
  metadata: {
    namespace: "mongodb",
  },
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
});

db.addUser("ni", {
  db: "fkjkhgkdjf",
  password: "pass",
  roles: [
    {
      db: "admin",
      name: "root",
    },
  ],
})
;

db.finish();