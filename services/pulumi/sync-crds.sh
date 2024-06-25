#!/bin/bash

set -e

cd "$(dirname "$0")"

function ensure_installed {
    if ! command -v $1 &> /dev/null; then
        echo "$1 is not installed, please install it before running this script"
        exit 1
    fi

}

ensure_installed helm
ensure_installed crd2pulumi
ensure_installed yq

function download_crds_from_helm {
    local chart_id=$1
    local chart_version=$2
    local dir=$3

    local crds="$(helm show crds "$chart_id" --version "$chart_version")"

    if [ -z "$crds" ]; then
        return
    fi 
    
    local crds_file="$dir/$chart_id.yaml"
    mkdir -p "$(dirname "$crds_file")"
    echo "$crds" > "$crds_file"
    echo "$crds_file"
}

function download_crds_from_helm_template {
    local chart_id=$1
    local chart_version=$2
    local name=$3
    local options=$4
    local dir=$5

    local crds="$(helm template "$name" "$chart_id" --version "$chart_version" --dry-run=server $options | yq '. | select(.kind == "CustomResourceDefinition")')"

    if [ -z "$crds" ]; then
        return
    fi 
    
    local crds_file="$dir/$chart_id.yaml"
    mkdir -p "$(dirname "$crds_file")"
    echo "$crds" > "$crds_file"
    echo "$crds_file"
}

function download_crds_with_curl {
    local name=$1
    local url=$2
    local dir=$3

    local crds="$(curl -s "$url")"

    if [ -z "$crds" ]; then
        return
    fi

    local crds_file="$dir/$name.yaml"
    mkdir -p "$(dirname "$crds_file")"
    echo "$crds" > "$crds_file"
    echo "$crds_file"
}

function download_crds {
    local charts_file=$1
    local dir=$2

    local crds=()

    readarray helm_crds < <(yq -o=j -I=0 '.helm-crds[]' "$charts_file")
    for helm_crd in "${helm_crds[@]}"; do
        local chart_id="$(echo "$helm_crd" | yq '.chart')"
        local chart_version="$(echo "$helm_crd" | yq '.version')"

        echo "[Helm CRDs] Downloading CRDs for $chart_id:$chart_version" 1>&2
        crds+=("$(download_crds_from_helm "$chart_id" "$chart_version" "$dir")")
    done

    readarray helm_templates < <(yq -o=j -I=0 '.helm-templates[]' "$charts_file")
    for helm_template in "${helm_templates[@]}"; do
        local chart_id="$(echo "$helm_template" | yq '.chart')"
        local chart_version="$(echo "$helm_template" | yq '.version')"
        local name="$(echo "$helm_template" | yq '.name')"
        local options="$(echo "$helm_template" | yq '.options')"

        echo "[Helm Templates] Downloading CRDs for $chart_id:$chart_version" 1>&2
        crds+=("$(download_crds_from_helm_template "$chart_id" "$chart_version" "$name" "$options" "$dir")")
    done

    readarray curl_crds < <(yq -o=j -I=0 '.curl-crds[]' "$charts_file")
    for curl_crd in "${curl_crds[@]}"; do
        local name="$(echo "$curl_crd" | yq '.name')"
        local url="$(echo "$curl_crd" | yq '.url')"

        echo "[Curl CRDs] Downloading CRDs for $name" 1>&2
        crds+=("$(download_crds_with_curl "$name" "$url" "$dir")")
    done

    echo "${crds[@]}"
}

rm -rf crds/

crd_paths="$(download_crds "crds.yaml" "crds/.tmp/")"
crd2pulumi -n ${crd_paths[@]}

rm -rf crds/.tmp/

echo "CRDs synced successfully"
