#!/bin/bash

set -o noglob

if ! command -v helm &> /dev/null; then
    echo "Helm is not installed, please install it before running this script"
    exit 1
fi

if ! command -v crd2pulumi &> /dev/null; then
    echo "crd2pulumi is not installed, please install it before running this script"
    exit 1
fi

DIRNAME="$(dirname $0)"

GENERATED_CRDS=()
for chart in $(cat "$DIRNAME/charts.txt"); do
    CHART_ID="$(echo "$chart" | cut -d':' -f1)"
    CHART_VERSION="$(echo "$chart:*" | cut -d':' -f2)"

    if [ "$CHART_VERSION" == "*" ]; then
        echo "No version specified for $CHART_ID, using latest version"
    fi

    echo "Downloading CRDs for $CHART_ID:$CHART_VERSION"

    CHART_CRDS="$(helm show crds "$CHART_ID" --version "$CHART_VERSION")"
    
    if [ -z "$CHART_CRDS" ]; then
        continue
    fi 
    
    mkdir -p "$DIRNAME/helm/$CHART_ID" 
    echo "$CHART_CRDS" > "$DIRNAME/helm/$CHART_ID/crds.yaml"
    GENERATED_CRDS+=("$DIRNAME/helm/$CHART_ID/crds.yaml")
done

rm -rf "$DIRNAME/crds"
crd2pulumi -n ${GENERATED_CRDS[@]}
rm -rf "$DIRNAME/helm"

echo "CRDS synced successfuly!"
