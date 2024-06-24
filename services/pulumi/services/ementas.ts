import * as k8s from "@pulumi/kubernetes";

const namespace = new k8s.core.v1.Namespace("ementas", {
  metadata: {
    name: "ementas",
  },
});


