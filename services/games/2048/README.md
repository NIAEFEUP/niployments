# 2048 — Simple Setup

Simplest possible deployment of [2048](https://github.com/gabrielecirulli/2048)
using the prebuilt image `alexwhen/docker-2048` (nginx + static site, port 80).

## Files

- `00-namespace.yaml` — creates namespace `game-2048`
- `01-deployment.yaml` — Deployment (2 replicas) + ClusterIP Service
- `02-ingress-route.yaml` — Traefik IngressRoute, no TLS → `http://2048.localhost/`
- `deploy.sh` — `kubectl apply` all files in order

## Deploy

Prerequisites: kind dev cluster up with Traefik (`bash dev/setup-kind-cluster.sh`)
and `kubectl` pointed at `kind-niployments-test-cluster`:

```bash
kubectl config use-context kind-niployments-test-cluster
```

Deploy from repo root or this folder:

```bash
bash services/games/2048/deploy.sh
# or:
cd services/games/2048
./deploy.sh
```

Verify:

```bash
kubectl -n game-2048 get pods,svc,ingressroutes.traefik.io
kubectl -n game-2048 wait --for=condition=ready pod -l app=game-2048 --timeout=120s
```

Then open http://2048.localhost/

Access via port-forward (kind Traefik LB IP isn't reachable from host directly):

```bash
# 8080 is often taken (e.g. by aws-course-viewer), use 8888 or another free port:
kubectl port-forward -n kube-system svc/traefik 8888:80
# open http://2048.localhost:8888/
# or: curl -H "Host: 2048.localhost" http://127.0.0.1:8888/
```

## Useful commands

```bash
kubectl -n game-2048 get pods,svc,ingressroute
kubectl -n game-2048 logs -l app=game-2048
kubectl -n game-2048 delete -f 01-deployment.yaml  # teardown demo
./deploy.sh  # re-apply
```
