#!/bin/bash
kubectl apply -k $(dirname $0) --server-side --force-conflicts
