helm repo add nextcloud https://nextcloud.github.io/helm/
helm repo update

kubectl apply -f $(dirname $0)/00-namespace.yaml
kubectl apply -f $(dirname $0)/01-secrets.yaml
kubectl apply -f $(dirname $0)/02-certificates.yaml
kubectl apply -f $(dirname $0)/03-ingress-routes.yaml

helm upgrade --install nextcloud nextcloud/nextcloud --namespace nextcloud -f $(dirname $0)/values.yaml
