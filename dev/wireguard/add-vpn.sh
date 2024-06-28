#!/bin/sh

cd "$(dirname "$0")"

kubectl apply -f 01-wireguard.yaml

kubectl wait --for=jsonpath='.status.readyReplicas'=1  -n wireguard deployment/wireguard
sleep 5

kubectl -n wireguard exec deployment/wireguard -- cat /config/peer1/peer1.conf > ~/peer1.conf
nmcli connection import type wireguard file ~/peer1.conf