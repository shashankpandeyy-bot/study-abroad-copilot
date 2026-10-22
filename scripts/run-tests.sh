#!/usr/bin/env bash
# Runs the plain-code tests (no API key and no network needed).
# Node cannot resolve extension-less imports, so lib/ is copied to a temp folder with ".ts" added to them.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/lib"
cp "$ROOT"/lib/*.ts "$TMP/lib/"
ln -s "$ROOT/node_modules" "$TMP/node_modules"
sed -i.bak -E 's#from "\./([A-Za-z]+)"#from "./\1.ts"#' "$TMP"/lib/*.ts
rm "$TMP"/lib/*.bak
cp "$ROOT"/tests/*.test.mjs "$TMP/"
cd "$TMP"
for f in *.test.mjs; do
  echo "== $f"
  node --no-warnings "$f"
done
echo "All test files passed."
