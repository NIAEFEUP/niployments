#!/bin/sh

KRATOS_POD=$(kubectl get pods --no-headers -n sso -o custom-columns=":metadata.name" | grep '^kratos' | head -n 1)

kubectl -n sso port-forward $KRATOS_POD 4433:4433 4434:4434