* Run containerized app (straight from the docker hub)
$
docker run -d \
  --name minecraft \
  -p 25565:25565 \
  -e EULA=TRUE \
  -e MEMORY=2G \
  -v $(pwd)/data:/data \
  itzg/minecraft-server

* Command to stop
$
docker exec -it minecraft rcon-cli stop
* Could also just ask docker (nicely)
$
docker stop minecraft




# Kubernetes version
- Setup kind cluster (written in nip/dev/test-cluster.kind.yaml)
```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: niployments-test-cluster
networking:
  disableDefaultCNI: true   # do not install kindnet
  kubeProxyMode: none       # do not run kube-proxy
nodes:
  - role: control-plane
  - role: control-plane
  - role: control-plane
  - role: worker
  - role: worker
  - role: worker
    kubeadmConfigPatches:
      - |
        kind: JoinConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
            hostname-override: dell3

containerdConfigPatches:
  - |-
    [plugins."io.containerd.grpc.v1.cri".registry.configs."172.28.255.200".tls]
      insecure_skip_verify = true

```
- install with helm (using repo https://github.com/solarhess/kubernetes-minecraft-server/)
```shell
$ helm install minecraft helm/minecraft --namespace minecraft --create-namespace
```

- if u want to update:
```shell
$ helm upgrade --install minecraft ~/NI/miNIcraft/kubernetes-minecraft-server-master/helm/minecraft --namespace minecraft --create-namespace
```

- 
