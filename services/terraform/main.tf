terraform {
    required_providers {
        kubernetes = {
            source = "hashicorp/kubernetes"
            version = "~> 2.0"
        }
        helm = {
            source = "hashicorp/helm"
            version = "~> 2.0"
        }
    }
}

provider "kubernetes" {
    config_path = "~/.kube/config"
    config_context = "kind-niployments-test-cluster"
}

provider "helm" {
    kubernetes {
        config_path = "~/.kube/config"
        config_context = "kind-niployments-test-cluster"
    }
}

resource "helm_release" "traefik" {
    name = "traefik"
    chart = "traefik"
    repository = "https://traefik.github.io/charts"
    namespace = "kube-system"
    version = "25.0.0"
    values = [file("../traefik/values-dev.yaml")]
}