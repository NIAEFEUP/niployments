# Headscale on NIployments

This service deploys Headscale on Kubernetes and uses a Raspberry Pi as a dual-tailnet gateway:

- one `tailscaled` instance connected to the official Tailscale tailnet;
- one `tailscaled` instance connected to the Headscale tailnet.

The gateway advertises routes and exit-node capability so the team can reach cluster resources remotely.

## Architecture

- Headscale runs in Kubernetes (`services/headscale`).
- Traefik exposes `headscale.niaefeup.pt`.
- Raspberry Pi gateway connects to both control planes (official + Headscale).
- Routes advertised by the gateway are approved from an admin machine with cluster access.

## Choose Your Flow

- If you are deploying for real usage, follow [Production Flow (HTTPS)](#production-flow-https) from start to finish.
- If you are testing locally, follow [Development Flow (HTTP + Simulator)](#development-flow-http--simulator) from start to finish.

Do not mix steps between the two flows.

## Production Flow (HTTPS)

This is the default and recommended setup.

### Step 1 - Deploy Headscale in Kubernetes

Run:

```bash
./services/headscale/deploy.sh
```

This applies the production resources, including:

- `01-configuration.yaml` (`server_url: https://headscale.niaefeup.pt`)
- `05-certificates.yaml`
- `06-ingress-routes.yaml` (`websecure` + TLS)

### Step 2 - Create a Headscale key for the gateway

Run from an admin machine with `kubectl` access:

```bash
./services/headscale/scripts/01-create-rpi-key.sh
```

Save the printed `RPi Headscale auth key`; it is used on the Raspberry Pi in Step 3.

### Step 3 - Connect the physical Raspberry Pi gateway

Run on the Raspberry Pi:

```bash
./services/headscale/scripts/10-connect-rpi.sh <OFFICIAL_TAILSCALE_AUTH_KEY> <HEADSCALE_AUTH_KEY>
```

What this script does:

- starts two independent `tailscaled` daemons;
- configures forwarding + NAT;
- connects one daemon to the official tailnet;
- connects the second daemon to Headscale and advertises routes.

### Step 4 - Approve advertised routes in Headscale

After the Raspberry Pi is connected, run from the admin machine:

```bash
./services/headscale/scripts/02-approve-rpi-routes.sh
```

### Step 5 - Create user keys for team members

Run from the admin machine:

```bash
./services/headscale/scripts/03-create-user-key.sh
```

The script is interactive and prints the exact `tailscale up` command each user should run.

## Development Flow (HTTP + Simulator)

Use this only for local testing.

### Step 1 - Deploy Headscale in dev mode

Run:

```bash
./services/headscale/deploy-dev.sh
```

This applies dev resources:

- `01-configuration-dev.yaml` (`server_url: http://headscale.niaefeup.pt`)
- `06-ingress-routes-dev.yaml` (`web`, no TLS)

It also removes prod-only resources (`Certificate` + HTTPS route) to avoid conflicts.

### Step 2 - Configure local network access to the dev cluster

For local kind clusters, configure Traefik LB IP routing and hosts mapping:

```bash
# Check what's the external IP of Traefik LoadBalancer
# If it's `<pending>`, something went wrong with the setup
kubectl get svc traefik -n kube-system
echo "<EXTERNAL-IP> headscale.niaefeup.pt" | sudo tee -a /etc/hosts

curl http://headscale.niaefeup.pt/health
```

Expected health response:

```json
{"status":"pass"}
```

### Step 3 - Start the Raspberry Pi simulator

Run:

```bash
./services/headscale/setup-rpi-container.sh
```

This builds and starts `rpi-simulator` using:

- `services/headscale/simulator/Dockerfile`
- `services/headscale/simulator/docker-compose.yaml`

It configures:

- SSH access on `localhost:2222` (user `root`, password `raspberry`)
- Kubernetes config inside container
- `headscale.niaefeup.pt` hosts entry inside simulator
- `/opt/headscale/10-connect-rpi.sh` copied for execution

Connect with:

```bash
ssh root@localhost -p 2222
# Password: raspberry
```

### Step 4 - Create a Headscale key for the simulated gateway

Run from admin machine:

```bash
./services/headscale/scripts/01-create-rpi-key.sh
```

### Step 5 - Connect the simulated gateway

Run inside the simulator:

```bash
HEADSCALE_URL=http://headscale.niaefeup.pt /opt/headscale/10-connect-rpi.sh <OFFICIAL_KEY> <HEADSCALE_KEY>
```

### Step 6 - Approve routes in Headscale

Run from admin machine:

```bash
./services/headscale/scripts/02-approve-rpi-routes.sh
```

### Step 7 - Create dev user keys

Run from admin machine:

```bash
LOGIN_SERVER=http://headscale.niaefeup.pt ./services/headscale/scripts/03-create-user-key.sh
```

## Script Reference

All scripts are in `services/headscale/scripts`.

### `01-create-rpi-key.sh`

Creates (or reuses) the gateway user and issues a pre-auth key.

Optional environment variables:

- `RPI_USER` (default: `subnet-router`)
- `KEY_EXPIRATION` (default: `24h`)
- `REUSABLE` (default: `true`)

### `02-approve-rpi-routes.sh`

Approves routes advertised by nodes owned by the gateway user.

Optional environment variables:

- `RPI_USER` (default: `subnet-router`)
- `ROUTES` (default: `0.0.0.0/0,::/0`)

### `03-create-user-key.sh`

Interactive user provisioning script.

Optional environment variable:

- `LOGIN_SERVER` (default: `https://headscale.niaefeup.pt`)

### `10-connect-rpi.sh`

Connects a gateway device to both control planes.

Optional environment variables:

- `HEADSCALE_URL` (default: `https://headscale.niaefeup.pt`)
- `RPI_HOSTNAME` (default: `rpi-gateway`)
- `WAN_INTERFACE` (default: `eth0`)
