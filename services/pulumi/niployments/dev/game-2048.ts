import { AppNamespace } from "#components/app-namespace.js";
import { TlsIngress } from "#components/tls-ingress.js";
import { WebApp } from "#components/web-app.js";
import { hostRule } from "#utils/traefik.js";

const namespace = "game-2048";

/**
 * 2048, used in the onboarding workshop. nginx + the static game from
 * https://github.com/gabrielecirulli/2048, served without TLS to keep the setup simple
 * at http://2048.localhost/ (Traefik resolves *.localhost, no /etc/hosts needed).
 */
export function game2048() {
  const ns = new AppNamespace(namespace);

  const app = new WebApp(
    "game-2048",
    {
      namespace,
      replicas: 2,
      containers: [
        {
          name: "game-2048",
          image: "alexwhen/docker-2048:latest",
          ports: [{ containerPort: 80 }],
        },
      ],
      targetPort: 80,
      dependsOn: [ns],
    },
    { dependsOn: [ns] },
  );

  new TlsIngress("game-2048", {
    namespace,
    name: "game-2048",
    insecure: true,
    routes: [
      {
        kind: "Rule",
        match: hostRule(["2048.localhost"]),
        services: [app.target],
      },
    ],
  });
}
