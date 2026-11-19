import * as k8s from "@pulumi/kubernetes";
import { prefixer } from "./prefixer.js";

export const namespace = new k8s.core.v1.Namespace(prefixer.namespace(), {
  metadata: {
    name: prefixer.base(),
  },
});
