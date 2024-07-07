import * as pulumi from "@pulumi/pulumi";
import { MongoDBCommunityController } from "../../../resources/mongodb";

const appsDatabases = ["admin", "nimentas"] as const;

export const apps = new MongoDBCommunityController("mongodb-apps", {
  dbs: appsDatabases,
  mdbc: {
    metadata: {
        name: "mongodb-apps",
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
                storageClassName: "longhorn-locality-retain",
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

const config = new pulumi.Config();

apps.addUser({
    name: "ni",
    db: "admin",
    password: config.requireSecret("mongodb/admin-password"),
    roles: appsDatabases.map((db) => ({
        name: "root",
        db,
    })),
});
