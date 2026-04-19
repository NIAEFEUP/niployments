#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"

function ensure_installed {
    if ! command -v $1 &> /dev/null; then
        echo "$1 is not installed, please install it before running this script"
        exit 1
    fi

}

function ensure_yq {
    ensure_installed yq

    # https://github.com/mikefarah/yq/blob/ef6fb92e7f314e7f0ef49da4385458271203119a/cmd/version.go#L28
    if ! yq --version | grep -q "yq (https://github.com/mikefarah/yq/)"; then
        echo "Your yq version is not supported, please download the latest version from https://github.com/mikefarah/yq/" 1>&2
        exit 1
    fi
}

ensure_installed helm
ensure_installed crd2pulumi
ensure_installed pnpm
ensure_yq

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

    local crds="$(curl -s "$url" | yq '. | select(.kind == "CustomResourceDefinition")')"

    if [ -z "$crds" ]; then
        return
    fi

    local crds_file="$dir/$name.yaml"
    mkdir -p "$(dirname "$crds_file")"
    echo "$crds" > "$crds_file"
    echo "$crds_file"
}

function add_repositories {
    local charts_file=$1

    echo "[Helm] Adding repositories" 1>&2

    readarray repositories < <(yq -o=j -I=0 '.repositories[]' "$charts_file")
    for repository in "${repositories[@]}"; do
        local name="$(echo "$repository" | yq '.name')"
        local url="$(echo "$repository" | yq '.url')"

        helm repo add "$name" "$url" --force-update
    done

    helm repo update
}

function download_crds {
    local charts_file=$1
    local dir=$2

    local crds=()

    readarray helm_crds < <(yq -o=j -I=0 '.manifests[] | select(.type == "helm")' "$charts_file")
    for helm_crd in "${helm_crds[@]}"; do
        local chart_id="$(echo "$helm_crd" | yq '.chart')"
        local chart_version="$(echo "$helm_crd" | yq '.version // "*"')"

        echo "[Helm CRDs] Downloading CRDs for $chart_id:$chart_version" 1>&2
        crds+=("$(download_crds_from_helm "$chart_id" "$chart_version" "$dir")")
    done

    readarray helm_templates < <(yq -o=j -I=0 '.manifests[] | select(.type == "template")' "$charts_file")
    for helm_template in "${helm_templates[@]}"; do
        local chart_id="$(echo "$helm_template" | yq '.chart')"
        local chart_version="$(echo "$helm_template" | yq '.version // "*"')"
        local options="$(echo "$helm_template" | yq '.options // ""')"
        local name="$(echo "$chart_id" | grep -oe '[^/]*$')"

        echo "[Helm Templates] Downloading CRDs for $chart_id:$chart_version" 1>&2
        crds+=("$(download_crds_from_helm_template "$chart_id" "$chart_version" "$name" "$options" "$dir")")
    done

    readarray curl_crds < <(yq -o=j -I=0 '.manifests[] | select(.type == "curl")' "$charts_file")
    for curl_crd in "${curl_crds[@]}"; do
        local name="$(echo "$curl_crd" | yq '.name')"
        local url="$(echo "$curl_crd" | yq '.url')"

        echo "[Curl CRDs] Downloading CRDs for $name" 1>&2
        crds+=("$(download_crds_with_curl "$name" "$url" "$dir")")
    done

    echo "${crds[@]}"
}

function patch_crds_package() {
    local crds_package=$1
    yq -i '.version = "0.0.0"' -oj "$crds_package/package.json"
    yq -i '.exports.["."] = "./bin/index.js"' -oj "$crds_package/package.json"
}

function build_crds_package() {
    local crds_package=$1
    pnpm install --use-stderr
    pnpm run -C "$crds_package" build > /dev/null
}

rm -rf crds/

SPEC_FILE="crds.yaml"
CRDS_PROJECT_DIR="crds/nodejs/"

# 1. Add helm repositories
echo
add_repositories "$SPEC_FILE"

# 2. Download CRDs from sources
echo
crd_paths="$(download_crds "$SPEC_FILE" "$(dirname "$CRDS_PROJECT_DIR")/.tmp/")"

# 3. Generate Pulumi CRDs package
echo
crd2pulumi -n ${crd_paths[@]}

# 4. Patch and build Pulumi CRDs package
echo
patch_crds_package "$CRDS_PROJECT_DIR"
build_crds_package "$CRDS_PROJECT_DIR"

echo
echo "CRDs synced successfully."
