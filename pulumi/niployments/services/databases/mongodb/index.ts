import * as pulumi from "@pulumi/pulumi";
import { MongoDBCommunityController } from "#resources/mongodb/index.js";

export const apps = new MongoDBCommunityController("mongodb-apps", {
  dbs: ["admin", "nimentas"],
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
  roles: apps.dbs.map((db) => ({
    name: "root",
    db,
  })),
});
