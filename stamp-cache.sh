#!/usr/bin/env bash
# Re-stamp ?v=<content-hash> onto local CSS/JS references in index.html.
# Run before committing/deploying after editing any CSS or JS file, so the
# immutable cache rule in nginx.conf always serves the latest version.
set -euo pipefail

cd "$(dirname "$0")"
HTML="index.html"

# Every local css/js currently referenced in the HTML (ignores external URLs).
mapfile -t assets < <(grep -oE '(href|src)="(static/[^"?]+\.(css|js))' "$HTML" \
    | sed -E 's/^(href|src)="//' | sort -u)

for asset in "${assets[@]}"; do
    [ -f "$asset" ] || { echo "skip (missing): $asset" >&2; continue; }
    hash="$(md5sum "$asset" | cut -c1-8)"
    # Replace existing ?v=... or append a fresh one, for every reference.
    sed -i -E "s#(${asset})(\?v=[0-9a-f]+)?#\1?v=${hash}#g" "$HTML"
    echo "stamped $asset -> ?v=${hash}"
done
