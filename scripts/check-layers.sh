#!/usr/bin/env bash
# Stops a package or deploy whose sharp layer is not the version the tests ran, or not arm64:
# with sharp in external and exclude, the layer's copy is the one Lambda runs.
set -euo pipefail
cd "$(dirname "$0")/.."

project="$(node -p "require('./node_modules/sharp/package.json').version")"
layer_file="layers/sharp/nodejs/node_modules/sharp/package.json"

test -f "${layer_file}" || {
  echo "No sharp layer in layers/sharp: run pnpm build:layers." >&2
  exit 1
}

layer="$(node -p "require('./${layer_file}').version")"
if [ "${layer}" != "${project}" ]; then
  echo "The sharp layer holds ${layer}, the project ${project}: run pnpm build:layers." >&2
  exit 1
fi

binary="$(find layers/sharp/nodejs/node_modules/@img -name '*.node' | head -n 1)"
file -b "${binary}" | grep -q 'ARM aarch64' || {
  echo "The sharp binary in the layer is not arm64: $(file -b "${binary}")" >&2
  exit 1
}

echo "sharp layer ${layer} (arm64) matches the project."
