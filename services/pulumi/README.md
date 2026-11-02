# niployments (Pulumi)

Everything that runs in the cluster is declared in [`niployments/`](niployments), as one Pulumi
project with one stack per cluster:

| Stack         | Cluster                 | State                          |
| ------------- | ----------------------- | ------------------------------ |
| `production`  | the NIAEFEUP cluster    | Cloudflare R2 bucket (shared)  |
| `development` | your local kind cluster | local (`pulumi login --local`) |

The stack decides _where_ we deploy (`niployments:env`), the **features** decide _what_ is deployed
(`niployments:features`, defaults in [`config.ts`](niployments/config.ts)).

## Layout

```
niployments/
  index.ts          what gets deployed (one line per service, gated by features)
  config.ts         typed stack config: environment, features, issuers, storage classes
  versions.ts       Helm chart versions (must be pinned to what runs in the cluster)
  components/       reusable building blocks: WebApp, TlsIngress, CronApp, HelmApp, AppNamespace
  platform/         cluster services: cert-manager, traefik, longhorn, harbor, monitoring, ...
  databases/        mongodb, postgres (CloudNativePG), valkey, pgadmin
  apps/             our apps: websites, tts, inicio, plausible, nextcloud, ...
  dev/              onboarding helpers, only deployed in development
  assets/<svc>/     Helm values: values.yaml + optional values.<stack-env>.yaml override
  crd-manifests/    CRDs the typed `crds` SDK is generated from
  tests/            builds the whole resource graph with Pulumi mocks (no cluster needed)
```

## Setup

```sh
nix develop          # or direnv allow: node 24, pnpm 12, pulumi, kubectl, helm, kind
cd services/pulumi/niployments
pulumi install       # pnpm install + generates the typed CRD SDK (sdks/crds, git-ignored)
pnpm run test        # type check + resource graph with Pulumi mocks
```

The project is self-contained (it is not a pnpm workspace) and runs its TypeScript directly
(`main: index.ts`, through `ts-node`), so there is no build step.

### Typed CRDs

`cert-manager`, Traefik, CloudNativePG, Longhorn, Cilium and MongoDB resources are typed by a
[Kubernetes provider extension](https://www.pulumi.com/dev/tutorials/typed-customresources-with-provider-extensions/)
named `crds` (`import * as crds from "@pulumi/crds"`, resource types look like
`crds:cert-manager.io/v1:Certificate`). The CRDs it is built from are committed in
[`crd-manifests/`](niployments/crd-manifests), and listed in the `packages:` entry of
[`Pulumi.yaml`](niployments/Pulumi.yaml). `pulumi install` regenerates the SDK from that entry
(into `sdks/crds`, which is not committed), so CI and the Pulumi Kubernetes Operator get it for free.

To add or bump a CRD source, edit [`crds.yaml`](niployments/crds.yaml) (versions must match what runs in
the cluster), run `./sync-crds.sh` from `niployments/` (needs helm, yq, curl, pulumi and network
access; it rewrites `crd-manifests/` and the `packages:` entry) and commit both. The provider version
(`KUBERNETES_PROVIDER_VERSION` in `sync-crds.sh`) must match `@pulumi/kubernetes`.

### Linting and formatting

`pnpm run check` runs [oxlint](https://oxc.rs/docs/guide/usage/linter) (type-aware, config in
`.oxlintrc.json`) and [oxfmt](https://oxc.rs/docs/guide/usage/formatter). Using a `pulumi.Output` inside a
plain template literal is reported by `typescript/no-base-to-string` and `restrict-template-expressions`
(use `pulumi.interpolate`). `@pulumi/eslint-plugin` does the same, but cannot run under oxlint.

### Production

```sh
export AWS_ACCESS_KEY_ID=...        # Cloudflare R2 API token
export AWS_SECRET_ACCESS_KEY=...
export PULUMI_CONFIG_PASSPHRASE=... # from the team password manager
pulumi login 's3://niployments-pulumi-state?endpoint=52d22ed664e31a094229250acd87ccfb.eu.r2.cloudflarestorage.com&region=auto'
pulumi stack select production
pulumi preview --diff
```

The cluster already runs these services, so the first deployments adopt them rather than create
them. Read [MIGRATION.md](niployments/MIGRATION.md) first.

### Development

```sh
dev/setup-kind-cluster.sh           # kind + Cilium (from the repository root)
cd services/pulumi/niployments
pulumi login --local
pulumi stack init development       # do not commit the encryptionsalt added to Pulumi.development.yaml
pulumi up
```

Enable more of the platform with `pulumi config set --path 'features.inicio' true`. Services that
need secrets ask for them with `pulumi config set --secret <group>/<name> <value>`; any value works
in development.

## Adding a service

1. Write a function in `apps/<name>.ts` using the components (look at `apps/aefeup.ts`).
2. Add it to `features` in `config.ts` and to the list in `index.ts`.
3. Names are explicit (`metadata.name`) everywhere. Never rely on Pulumi auto-naming.
4. Needs a database user? Call `postgres().addRole(...)` or `mongodbApps().addUser(...)` from your
   function; the database resource is created once every service has registered itself.
5. `pnpm run check && pnpm run test`.
