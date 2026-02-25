#!/bin/sh

# KRATOS_POD=$(kubectl get pods --no-headers -n sso -o custom-columns=":metadata.name" | grep '^kratos' | head -n 1)
HYDRA_POD=$(kubectl get pods --no-headers -n sso -o custom-columns=":metadata.name" | grep '^hydra' | head -n 1)

kubectl -n sso exec -it $HYDRA_POD -- /bin/sh << 'EOF'
export code_client=$(hydra create client \
    --endpoint http://127.0.0.1:4445 \
    --grant-type authorization_code,refresh_token \
    --response-type code,id_token \
    --scope openid --scope offline \
    --redirect-uri http://127.0.0.1:5555/callback)
export code_client_id="$(echo $code_client | awk '{print $3}')"
export code_client_secret="$(echo $code_client | awk '{print $6}')"
hydra perform authorization-code \
    --client-id $code_client_id \
    --client-secret $code_client_secret \
    --endpoint http://127.0.0.1:4444/ \
    --port 5555 \
    --scope openid --scope offline
EOF