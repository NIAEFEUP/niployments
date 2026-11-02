import { HelmApp } from "#components/helm-app.js";
import { lazy } from "#utils/lazy.js";

/**
 * Ingress controller. Its CRDs (IngressRoute, Middleware) are installed by the chart.
 */
export const traefik = lazy(() => {
  const app = new HelmApp("traefik", {
    namespace: "kube-system",
    releaseName: "traefik",
    chart: "traefik",
    repo: "https://traefik.github.io/charts",
    assets: "traefik",
    // The LoadBalancer IP only appears once the Cilium IP pool exists, so do not wait for it
    skipAwait: true,
  });

  return { app, release: app.release };
});
