import * as pulumi from "@pulumi/pulumi";
import { storageClasses } from "#config";
import { MongoDBCommunityController } from "./controller.js";
import { lazy } from "#utils/lazy.js";

/**
 * The MongoDB replica set shared by all the apps. Apps add their own users
 * with `mongodbApps().addUser(...)`.
 */
export const mongodbApps = lazy(() => {
  const config = new pulumi.Config();

  const apps = new MongoDBCommunityController("mongodb-apps", {
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
                  storageClassName: storageClasses.localityRetain,
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

  apps.addUser({
    name: "ni",
    db: "admin",
    password: config.requireSecret("mongodb/admin-password"),
    roles: apps.dbs.map((db) => ({
      name: "root",
      db,
    })),
  });

  return apps;
});
