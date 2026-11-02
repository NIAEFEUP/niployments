#!/usr/bin/env bash
#
# Generates the typed CRD SDK (@pulumi/crds) from the manifests in crd-manifests/, as a Pulumi
# Kubernetes provider extension:
# https://www.pulumi.com/dev/tutorials/typed-customresources-with-provider-extensions/
#
# The SDK is written to crds/nodejs, a pnpm workspace package that niployments depends on with
# `workspace:*`. It is not committed: run this script (it only needs the pulumi CLI), then
# `pnpm install`. Use ./sync-crds.sh to update the manifests themselves.

set -e

cd "$(dirname "$0")"

# must match the @pulumi/kubernetes SDK (extensions need >= 4.34.0)
KUBERNETES_PROVIDER_VERSION="4.34.2"

if ! command -v pulumi &> /dev/null; then
    echo "pulumi is not installed, please install it before running this script"
    exit 1
fi

extension="name=crds"
while IFS= read -r manifest; do
    extension+=" crd-manifest=$PWD/$manifest"
done < <(find crd-manifests -name '*.yaml' | sort)

rm -rf crds/
pulumi package gen-sdk kubernetes \
    --version "$KUBERNETES_PROVIDER_VERSION" \
    --extension "$extension" \
    --language nodejs \
    --local \
    --out crds

echo
echo "CRD SDK generated in crds/nodejs, run pnpm install to build it."
