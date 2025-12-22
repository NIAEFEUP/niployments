helm repo add nextcloud https://nextcloud.github.io/helm/
helm repo update

kubectl apply -f $(dirname $0)/00-namespace.yaml
kubectl apply -f $(dirname $0)/02-ingress-routes.yaml

helm upgrade --install nextcloud nextcloud/nextcloud --namespace nextcloud -f $(dirname $0)/values.yaml
