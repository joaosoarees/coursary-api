#!/usr/bin/env bash
# Builds the sharp layer under layers/sharp for the arm64 functions: npm, not pnpm, so the
# layer holds real folders, and the exact version the project installed and tested.
set -euo pipefail
cd "$(dirname "$0")/.."

version="$(node -p "require('./node_modules/sharp/package.json').version")"

echo "Building the sharp layer (sharp ${version}, linux-arm64, glibc)..."
rm -rf layers/sharp
mkdir -p layers/sharp/nodejs

npm install --prefix layers/sharp/nodejs --no-audit --no-fund --no-update-notifier --no-bin-links \
  --os=linux --cpu=arm64 --libc=glibc "sharp@${version}" >/dev/null

rm -f layers/sharp/nodejs/package.json layers/sharp/nodejs/package-lock.json

# npm skips a platform package it does not match without an error.
test -d layers/sharp/nodejs/node_modules/@img/sharp-linux-arm64 || {
  echo "The sharp binaries for linux-arm64 are missing from the layer." >&2
  exit 1
}
