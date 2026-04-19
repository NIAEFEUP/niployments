# PgAdmin

## Deployment

### Quick Start

From the repository root:

```bash
./services/databases/pgadmin/deploy.sh
```

This applies all manifests in dependency order:
1. Namespace creation (`00-namespace.yaml`)
2. Secrets (`01-secrets.yaml`)
3. ConfigMap with server configs (`02-config.yaml`)
4. Deployment, PVC & Service (`03-deployment.yaml`)
5. TLS Certificate (`04-certificates.yaml`)
6. Ingress routing via Traefik (`05-ingress-routes.yaml`)

### Prerequisites

- Kubernetes cluster running with Traefik and cert-manager
- CNPG PostgreSQL cluster deployed in the `pg` namespace
- DNS record for `pgadmin.niaefeup.pt` pointing to Traefik LB IP (`10.11.11.2` on prod, `172.28.255.205` on dev)

### Manual Deployment

If needed, apply manifests individually:

```bash
kubectl apply -f services/databases/pgadmin/00-namespace.yaml
kubectl apply -f services/databases/pgadmin/01-secrets.yaml
kubectl apply -f services/databases/pgadmin/02-config.yaml
kubectl apply -f services/databases/pgadmin/03-deployment.yaml
kubectl apply -f services/databases/pgadmin/04-certificates.yaml
kubectl apply -f services/databases/pgadmin/05-ingress-routes.yaml
```

## Configuration

### Pre-configured Database Servers

By default, PgAdmin comes with two pre-configured CNPG cluster connections:

| Server | Endpoint | Use Case |
|--------|----------|----------|
| CNPG Cluster (Read-Write) | `cnpg-cluster-rw.pg.svc.cluster.local:5432` | Writes, transactions, schema changes |
| CNPG Cluster (Read-Only) | `cnpg-cluster-ro.pg.svc.cluster.local:5432` | Read-only queries, reporting, analytics |

These are configured in [02-config.yaml](02-config.yaml) and automatically imported on startup.

### Default Admin Credentials

Stored in [01-secrets.yaml](01-secrets.yaml) (update before deploying):

- `PGADMIN_DEFAULT_EMAIL`: Configure this
- `PGADMIN_DEFAULT_PASSWORD`: Configure this (will be prompted to reset on first login)

Set these before deploying, or update the secret afterward:

```bash
kubectl set env -n pgadmin deployment/pgadmin \
  PGADMIN_DEFAULT_EMAIL=admin@niaefeup.pt \
  PGADMIN_DEFAULT_PASSWORD='<your-secure-password>'
```

## Adding New Database Servers Manually

After PgAdmin is deployed, you can add new servers via the web UI:

### Via Web Interface (Recommended)

1. Login to `https://pgadmin.niaefeup.pt`
2. Complete 2FA setup (if first login)
3. In the left sidebar, right-click **Servers** → **Register** → **Server**
4. Fill in the connection details:
   - **Name**: Descriptive server name
   - **Host**: Hostname or IP (must be reachable from PgAdmin pod)
   - **Port**: Usually `5432`
   - **Maintenance DB**: `postgres` (or your default database)
   - **Username**: Database role name
   - **Password**: Leave blank (enter when first connecting)
5. On the **SSL** tab: Set **SSL mode** to `prefer` or `require` depending on your setup
6. Click **Save**

### Discovering Available Services

To find available PostgreSQL services in the cluster:

```bash
# List all services in pg namespace (CNPG cluster endpoints)
kubectl get svc -n pg

# List services in other namespaces that might have databases
kubectl get svc -A | grep -E 'postgres|mysql|db|database'

# Get detailed connection info for a service
kubectl get svc <service-name> -n <namespace> -o jsonpath='{.spec.clusterIP}:{.spec.ports[0].port}'
```
