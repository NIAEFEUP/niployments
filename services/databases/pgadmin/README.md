# PgAdmin

## Deployment

### Quick Start

From the repository root:

```bash
./services/databases/pgadmin/deploy.sh
```

This applies all manifests in dependency order:
1. Installs pgadmin with helm charts
2. Created the certificates
3. Create the ingress routes

### Prerequisites

- Have the DNS record for `pgadmin.niaefeup.pt` available

## Configuration

You can configure the PGAdmin changing the `values.yaml` file before deployment. For more information you can check the official [documentation](https://artifacthub.io/packages/helm/runix/pgadmin4).

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
