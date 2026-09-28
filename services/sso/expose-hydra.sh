#!/bin/sh

HYDRA_POD=$(kubectl get pods --no-headers -n sso -o custom-columns=":metadata.name" | grep '^hydra' | head -n 1)

kubectl -n sso port-forward $HYDRA_POD 4444:4444 4445:4445 5555:5555
