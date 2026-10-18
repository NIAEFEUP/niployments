# Podinfo

Run these commands from `dev/onboarding/services/podinfo`, with your test cluster selected.

## Deploy or update

```bash
bash deploy.sh
```

The script installs Podinfo or updates the existing release using `values.yaml`.

## Open in the browser

```bash
kubectl port-forward -n podinfo svc/podinfo 8080:8081
```

Open [http://localhost:8080](http://localhost:8080). Keep the command running and stop it with Ctrl+C. Restart it if an update replaces the connected pod.

With the current values, `8080` is the local port, `service.externalPort: 8081` is the Service port, and `service.httpPort: 8081` is the application port inside the pod.

## Changes to try

Edit `values.yaml`, run `bash deploy.sh` again, and observe the result.

| Setting | Change to try |
| --- | --- |
| `ui.message` | Write your team's welcome message. |
| `ui.color` | Choose a quoted hex color, such as `"#00897b"`. |
| `ui.logo` | Use an image URL that the browser can access, or `""` for the default logo. A local file is not uploaded by Helm. |
| `replicaCount` | Switch between `1` and `3`, then inspect the pods. |
| `service.externalPort` | Change the Service port. Update the number after `:` in the port-forward command to match it. |
| `service.httpPort` | Change the application port inside the pod. The chart updates the application, container port, and health checks. The Service follows the named container port automatically. |
| `resources.requests` | Try CPU `20m` and memory `64Mi`. Requests are used to schedule pods. |
| `resources.limits` | CPU and memory caps. Keep requests at or below limits. `100m` is one tenth of a CPU core, and `Mi` means mebibytes. |

For example, change only `service.externalPort` to `9898`, leaving `service.httpPort` at `8081`. Apply with `bash deploy.sh`, stop the old forward, and run:

```bash
kubectl port-forward -n podinfo svc/podinfo 8080:9898
```

The browser URL stays [http://localhost:8080](http://localhost:8080). The Service now accepts traffic on `9898` and sends it to the application on `8081`. Changing only `service.httpPort` does not require a different port-forward mapping, though you may need to restart the forward after the rollout.

Inspect pods and resource settings:

```bash
kubectl get pods -n podinfo
kubectl describe deployment podinfo -n podinfo
```

Start with the UI, then replicas, ports, and resources. Change one thing at a time.

## Try deliberate failures

Set one flag under `faults` in `values.yaml` to `true`, then run `bash deploy.sh`.

| Flag | Effect |
| --- | --- |
| `delay` | Adds random response delays of up to 5 seconds. |
| `error` | Makes approximately one third of application requests return an HTTP error. |
| `unready` | Makes readiness checks fail, so affected pods are not eligible for normal Service traffic. |
| `unhealthy` | Makes health checks fail, which can cause Kubernetes to restart the container. |

Start with `delay` or `error`. Restart port-forwarding if needed, then repeat this command to compare responses:

```bash
curl -i http://localhost:8080/
```

With `unready` or `unhealthy`, `deploy.sh` can time out because it waits for pods to become ready. A timeout does not automatically undo the deployment.

To recover, set the enabled flags back to `false` and run `bash deploy.sh` again.
