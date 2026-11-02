import * as pulumi from "@pulumi/pulumi";
import * as crds from "@pulumi/crds";
import { isProduction } from "#config";
import { lazy } from "#utils/lazy.js";

/**
 * Cilium itself (the CNI) is installed by Ansible in production and by
 * dev/setup-kind-cluster.sh in development, because the cluster cannot schedule
 * pods without it. Pulumi only manages the resources that configure it.
 */
export const cilium = lazy(() => {
  const config = new pulumi.Config();
  const lbPool = config.requireObject<{ start: string; stop: string }>(
    "cilium/lb-pool",
  );

  new crds.cilium.v2alpha1.CiliumLoadBalancerIPPool("niployments-lb-pool", {
    metadata: { name: "niployments-lb-pool" },
    spec: { blocks: [lbPool] },
  });

  if (isProduction) {
    new crds.cilium.v2alpha1.CiliumBGPPeeringPolicy("niployments-bgp", {
      metadata: { name: "niployments-bgp" },
      spec: {
        virtualRouters: [
          {
            localASN: 65512,
            exportPodCIDR: true,
            neighbors: [
              { peerAddress: "10.10.0.2/32", peerASN: 65512 },
              { peerAddress: "10.10.0.3/32", peerASN: 65512 },
            ],
            serviceSelector: {
              matchExpressions: [
                {
                  key: "somekey",
                  operator: "NotIn",
                  values: ["never-used-value"],
                },
              ],
            },
          },
        ],
      },
    });
  } else {
    new crds.cilium.v2alpha1.CiliumL2AnnouncementPolicy("default", {
      metadata: { name: "default" },
      spec: {
        nodeSelector: {
          matchExpressions: [
            {
              key: "node-role.kubernetes.io/control-plane",
              operator: "DoesNotExist",
            },
          ],
        },
        interfaces: ["^eth[0-9]+"],
        externalIPs: true,
        loadBalancerIPs: true,
      },
    });
  }
});
