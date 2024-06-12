#!/bin/bash

helm repo add clustersecret https://charts.clustersecret.io/
helm upgrade --install clustersecret clustersecret/cluster-secret --version 0.4.0 -n clustersecret --create-namespace