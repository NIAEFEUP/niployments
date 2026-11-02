# Moving the production cluster to Pulumi

The program in this directory was written from the YAML in `services/`, **not from the live cluster**.
The two are known to disagree (see [Known drift](#known-drift)). Production runs real data
(PostgreSQL, MongoDB, Nextcloud, Plausible, Harbor, Longhorn volumes), so nothing may be recreated:
every object has to be **adopted** by Pulumi, and the first `pulumi up` of each wave must change nothing.

Everything below needs access to the cluster. Nothing here has been run against production; the mock tests
(`pnpm run test`) only prove that the resource graph builds and that every object has an explicit name.
The development stack and the adoption mechanism were run for real on a throwaway kind cluster
(see [section 2](#2-verify-the-adoption-mechanism-kind-throwaway)).

## 1. Prepare

1. **Inventory the live cluster** and write down, per service, the namespace, Helm release name, chart
   and version, and the object names:

   ```sh
   helm list -A
   kubectl get ns,deploy,sts,ds,svc,cronjob,pvc,sc,cm,ingressroute,middleware,certificate,clusterissuer -A
   kubectl get mongodbcommunity,clusters.postgresql.cnpg.io,scheduledbackup,recurringjobs.longhorn.io -A
   ```

2. **Pin every chart** to the version that is running:

   ```sh
   pulumi config set --path 'niployments:charts.<release>' <version>
   ```

   `versions.ts` has defaults for the charts the old scripts pinned (traefik, cert-manager,
   longhorn, external-dns, pgadmin4, podinfo); production **refuses to preview** while any other chart
   is unpinned. Releases that need a pin: `kubernetes-replicator`, `keel`,
   `nfs-subdir-external-provisioner`, `community-operator`, `harbor`, `loki`, `kube-prometheus`, `valkey`,
   `nextcloud`, `minecraft`. Also confirm the defaults, `deploy.sh` and `crds.yaml` disagree on Traefik
   (25.0.0 vs 28.3.0) and CNPG (1.23.2 vs 1.22.2).

3. **Copy the secrets out of the cluster** into the stack config. The files in `services/` still hold
   `<FILL-IN>` and old hardcoded values (Valkey `GreatPass`, inicio `changeme`, Grafana `tosta-mista-789`),
   which are _not_ necessarily what runs. If a value differs, Pulumi would overwrite production with it.

   ```sh
   kubectl get secret <name> -n <ns> -o jsonpath='{.data.<key>}' | base64 -d | pulumi config set --secret <key> -
   ```

   Keys the production stack needs (all secret unless noted; `pnpm run test` prints the current list):

   | Group           | Keys                                                                                                                                                                                                                                                    |
   | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | registry        | `registry/username`, `registry/password` (the `harbor-pull-secret` is built from them)                                                                                                                                                                  |
   | cloudflare      | `cloudflare/api-token`, `cloudflare/aefeup-api-token`, `external-dns/api-key`                                                                                                                                                                           |
   | harbor          | `harbor/admin-password`, `harbor/secret-key`                                                                                                                                                                                                            |
   | monitoring      | `monitoring/grafana-admin-password`                                                                                                                                                                                                                     |
   | longhorn        | `longhorn/r2-access-key-id`, `longhorn/r2-secret-access-key`, `longhorn/r2-endpoint`                                                                                                                                                                    |
   | postgres        | `postgres/backup-access-key-id`, `postgres/backup-secret-access-key`, `postgres/backup-endpoint` (plain), `postgres/<role>-password` for `ni`, `sinf-website-2023`, `website-ae`, `plausible`, `teup`, `tts`, `tts-staging`, `inicio`, `inicio-staging` |
   | mongodb         | `mongodb/admin-password`, `mongodb/nimentas-password`                                                                                                                                                                                                   |
   | valkey, pgadmin | `valkey/password`, `pgadmin/email`, `pgadmin/password`                                                                                                                                                                                                  |
   | nextcloud       | `nextcloud/{username,password,token,db-username,db-password,db-hostname,db-name}`                                                                                                                                                                       |
   | plausible       | `plausible/{secret-key-base,smtp-user-name,mailer-email,smtp-user-pwd,totp-vault-key}`, `plausible/postgres-db` (plain)                                                                                                                                 |
   | teup            | `teup/env`                                                                                                                                                                                                                                              |
   | inicio          | `inicio/jwt-secret`, `inicio-staging/jwt-secret`                                                                                                                                                                                                        |
   | tts             | `tts/env`, `tts-staging/env` (JSON objects, the env of the backend); `<tts,tts-staging>/{scrapy-user,scrapy-password}`, `/scrapy-year` and `/postgres-db` (plain)                                                                                       |
   | ni.fe.up.pt     | `ni-fe-up-pt/cert`, `ni-fe-up-pt/key` (currently created by hand in `ni/deploy.sh`)                                                                                                                                                                     |

4. **Create the stacks.** Retire the old ones without destroying anything: `pulumi stack export > backup.json`,
   then `pulumi stack rm --force` (never `pulumi destroy`). Create the R2 bucket for the state (separate from
   the backups), then `pulumi stack init production --secrets-provider passphrase` (see `../README.md`).

5. **Resolve the assumptions** below. Every spot in the code is marked with `PHASE0`.

## 2. Verify the adoption mechanism (kind, throwaway)

Checked on a scratch kind cluster with Pulumi 3.268 and `@pulumi/kubernetes` 4.23: the `development` stack was
created with `pulumi up`, then a second, empty stack was pointed at the same objects with
`scripts/adopt-inventory.sh` + `niployments:adopt`. What that showed:

- **Confirmed**: the `utils/adopt.ts` transform sets `import` under the real engine. `helm.v3.Release`,
  `Namespace`, `StorageClass`, `Deployment`, `Service` and the CR kinds `Certificate`, `ClusterIssuer` and
  `IngressRoute` were all imported, nothing was recreated, no pod restarted, and afterwards `pulumi preview`
  reports no changes, with or without `niployments:adopt` set.
- **An import is always followed by an update.** The adopted object is diffed against the program, and
  server-defaulted fields (`Deployment` strategy and revision limits, `Namespace` labels/finalizers, `Service`
  `clusterIP`, the Helm `repositoryOpts`) show up as `update`. For raw objects this was a no-op patch. So
  `pulumi preview --diff` is _not_ "imports only": read every `update` and check that it only adds defaulted fields.
- **A Helm import runs a real `helm upgrade`** (revision 1 became 2 on both releases). Here the chart and values were
  identical so nothing changed, but in production the upgrade applies whatever differs. Before each Helm wave
  compare `helm get values -a <release>` and `helm list` with `assets/<service>/values*.yaml` and the pinned
  chart version, and consider `helm diff upgrade` first.
- A `Service` import tried to **replace** the Service because the live `spec.clusterIP` was not in the program. Fixed in
  `components/web-app.ts` with `ignoreChanges` on `spec.clusterIP(s)`. Any new `Service` declared outside `WebApp`
  needs the same.

Still **not** checked (no CNPG, MongoDB or Longhorn on the scratch cluster):

- Importing the CRs `Cluster` (CNPG) and `MongoDBCommunity`, and their `ignoreChanges` needs.
- `k8s.yaml.v2.ConfigFile` (CNPG operator manifest, Longhorn prerequisites, MongoDB CRDs) adopting objects that
  were applied with `kubectl apply`. Its children are not covered by the inventory, so they are the
  likeliest to fail with "already exists"; if so, extend `utils/adopt.ts` to import them too.
- With server-side apply, Pulumi can take over fields owned by the `kubectl` field manager.
- Cilium (the CRs `CiliumLoadBalancerIPPool` and the L2/BGP policies): the kind cluster from `dev/setup-kind-cluster.sh`
  could not be started with rootless podman (the Cilium agent needs `/sys/fs/bpf` and `/etc/sysctl.d`), so the
  `cilium` feature was off in this run.

## 3. Adopt, wave by wave

Adoption is driven by an **inventory** of what exists in the cluster, because the program also declares
objects that do not exist yet (everything that was never deployed from this repository: the MongoDB stack, `ementas`,
the TTS env secret, the new TTS routes...) and `import` of a missing object is an error.

```sh
cd services/pulumi/niployments
./scripts/adopt-inventory.sh > adopt.production.json   # review it, then commit it
pulumi config set niployments:adopt adopt.production.json
```

Each declared object whose `Kind:namespace/name` is in the file (`Release:namespace/name` for Helm releases) is
registered with `import`, everything else is created. Edit the file to adopt a wave at a time. The code that
does it is [`utils/adopt.ts`](utils/adopt.ts). Note that an adopted object must be declared with the exact
`metadata.name` it has in the cluster, so objects that are in the inventory but not matched are a sign that the
code uses a different name (the file lists everything, `pulumi preview` shows what was matched).

Adopt in this order, enabling only those `features` (and the always-on cert-manager + traefik), with a
`pulumi preview --diff` after each one:

| Wave             | Features                                                      | What can go wrong                                                               |
| ---------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1 foundation     | `replicator`, `keel`, `externalDns`, (cert-manager, traefik)  | chart version mismatch upgrades the release; replicator namespace differs       |
| 2 storage        | `longhorn`, `nfsProvisioner`, `cilium`                        | `StorageClass.parameters` are immutable; Longhorn prerequisites already applied |
| 3 databases      | `postgres`, `mongodb`, `valkey`, `pgadmin`                    | operator version; role list must match `managed.roles` exactly                  |
| 4 registry       | `harbor`                                                      | Harbor's generated secrets; values must match `helm get values -a`              |
| 5 monitoring     | `monitoring`                                                  | `services/grafana` and `services/monitoring` were both used                     |
| 6 stateless apps | `aefeup`, `niWebsite`, `nitsig`, `inicio*`, `tts*`, `ementas` | Deployment selectors are immutable                                              |
| 7 stateful apps  | `plausible`, `teup`, `nextcloud`, `minicraft`                 | PVC `storageClassName`/size must match exactly                                  |

For each wave:

1. `pulumi preview --diff`. Every object must show `import`, and **no `replace`**. An `update` after an
   import is expected, but it may only add fields the API server defaulted (see section 2); any other `update`
   means the code differs from the live object: change the code, not the cluster. A `replace` of a live object
   (Service `clusterIP`, immutable selectors, PVC) must never be applied. Unlike what was first assumed, Pulumi
   does _not_ refuse to import when the inputs differ, so this review is the safety net. Helm releases are
   upgraded on import, so also diff their values (section 2).
2. `pulumi up`, then `pulumi preview` again: no changes.
3. Delete the wave's old YAML, values and `deploy.sh` from `services/` (see [Cleanup](#cleanup)).
4. When everything is adopted, unset `niployments:adopt` and delete the inventory.

Rollback of a wave: `pulumi state delete <urn>`. All stateful resources are `protect`ed and
`retainOnDelete`, so removing them from the state never removes them from the cluster.

### Replace ClusterSecret

`harbor-pull-secret` is now created in each namespace by `AppNamespace` (credentials from
`registry/*`). Adopt those secrets _before_ removing the ClusterSecret operator, and delete the
`ClusterSecret` with `--cascade=orphan` (or scale the operator down first), otherwise the operator may delete the
copies in every namespace and pods fail to pull images until Pulumi recreates them.

### Cilium

The agent is installed by Ansible (`kubeProxyReplacement`, a mistake takes the network down), so Pulumi only
manages `CiliumLoadBalancerIPPool` and `CiliumBGPPeeringPolicy`.

## Known drift

- Traefik: installed 25.0.0 (`deploy.sh`), `crds.yaml` 28.3.0 (only used to generate types).
- CNPG: operator 1.23.2 (`deploy-cnpg-*.sh`), CRDs generated from 1.22.2 before this change (now 1.23.2).
- cert-manager: `deploy.sh` is unpinned in production, `deploy-dev.sh` uses v1.14.7.
- Keel was deployed twice (`keel-dev-deployment.yaml` and the old Pulumi chart); now a single release.
- Longhorn namespace: `longhorn-system` (deploy script, RecurringJobs) vs `longhorn` (old `crds.yaml`).
- Monitoring: `services/grafana` and `services/monitoring` duplicate each other; only `monitoring` was ported.
- The TTS components did not set `metadata.name`, so if the old stack was deployed its objects have random
  suffixes. The new code uses `tts-frontend`, `tts-backend`, etc.; rename the code to match what is live.
- `tts/env`: the backend env Secret was referenced but never created in code. Use its live name via
  `niployments:tts/env-secret-name` (default `tts-env`).
- Nextcloud uses the CNPG role `nextcloud` / database `nextcloud-db`, which is not in `cnpg-cluster.yaml`.
- `tts-staging` scraper cron is `* * 4 * *` (every minute on the 4th); comments of the other crons are wrong.
  Preserved as is.

## Cleanup

After a service is adopted, delete from `services/`: its manifests, `deploy*.sh`, `values*.yaml`.
When all waves are done, also remove `check_secrets.sh`, `dev/create-harbor-pull-secret.sh`,
`services/ni/scrapper/1.txt` (a 17k-line log), `services/image-registry/{example-deployment,keel-*}.yaml`,
`services/storage/longhorn/test-workload.yaml`, and the duplicated Helm values left behind in `services/`.
