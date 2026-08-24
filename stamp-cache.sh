#!/usr/bin/env bash
# 1) Inject minified static/css/critical.css between the "CRITICAL CSS"
#    markers in index.html (that inline block is generated — edit the css
#    file, not the HTML).
# 2) Inject static/js/critical.js between the "CRITICAL JS" markers in
#    index.html (also generated — edit the js file, not the HTML).
# 3) Re-stamp ?v=<content-hash> onto local CSS/JS references in index.html.
# Run before committing/deploying after editing any CSS or JS file, so the
# immutable cache rule in nginx.conf always serves the latest version.
# 4) Sync with the latest version of copyhuy via rsync
set -euo pipefail

cd "$(dirname "$0")"
HTML="index.html"
CRITICAL="static/css/critical.css"
CRITICAL_JS="static/js/critical.js"

# ---- Critical CSS injection -------------------------------------------------
[ -f "$CRITICAL" ] || { echo "error: $CRITICAL not found" >&2; exit 1; }
grep -q '<!-- CRITICAL CSS -->' "$HTML" && grep -q '<!-- /CRITICAL CSS -->' "$HTML" \
    || { echo "error: CRITICAL CSS markers not found in $HTML" >&2; exit 1; }

# Minify: strip /* */ comments, collapse whitespace, drop spaces around
# punctuation and trailing semicolons. Good enough for this file; it contains
# no strings/URLs where whitespace would be significant.
min_css="$(tr '\n' ' ' < "$CRITICAL" \
    | sed -E 's~/\*([^*]|\*+[^*/])*\*+/~ ~g' \
    | sed -E 's/[[:space:]]+/ /g; s/ *([{};:,>]) */\1/g; s/;}/}/g' \
    | sed -E 's/^ +//; s/ +$//')"

tmp_css="$(mktemp)"
tmp_js=""
trap 'rm -f "$tmp_css" "$tmp_js"' EXIT
printf '%s\n' "$min_css" > "$tmp_css"

awk -v cssfile="$tmp_css" '
    /<!-- CRITICAL CSS -->/ {
        print
        print "<style>"
        while ((getline line < cssfile) > 0) print line
        close(cssfile)
        print "</style>"
        skip = 1
        next
    }
    /<!-- \/CRITICAL CSS -->/ { skip = 0 }
    skip { next }
    { print }
' "$HTML" > "$HTML.tmp" && mv "$HTML.tmp" "$HTML"
echo "injected $CRITICAL into $HTML ($(printf '%s' "$min_css" | wc -c) bytes minified)"

# ---- Critical JS injection --------------------------------------------------
[ -f "$CRITICAL_JS" ] || { echo "error: $CRITICAL_JS not found" >&2; exit 1; }
grep -q '<!-- CRITICAL JS -->' "$HTML" && grep -q '<!-- /CRITICAL JS -->' "$HTML" \
    || { echo "error: CRITICAL JS markers not found in $HTML" >&2; exit 1; }

# String-safe minify: drop full-line // comments and blank lines, trim each
# line. Newlines are kept as statement separators (no ASI hazard) and internal
# whitespace is left intact so string literals like CSS selectors survive.
min_js="$(sed -E 's~^[[:space:]]*//.*$~~' "$CRITICAL_JS" \
    | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' \
    | grep -v '^$' || true)"

tmp_js="$(mktemp)"
printf '%s\n' "$min_js" > "$tmp_js"

awk -v jsfile="$tmp_js" '
    /<!-- CRITICAL JS -->/ {
        print
        print "<script>"
        while ((getline line < jsfile) > 0) print line
        close(jsfile)
        print "</script>"
        skip = 1
        next
    }
    /<!-- \/CRITICAL JS -->/ { skip = 0 }
    skip { next }
    { print }
' "$HTML" > "$HTML.tmp" && mv "$HTML.tmp" "$HTML"
echo "injected $CRITICAL_JS into $HTML ($(printf '%s' "$min_js" | wc -c) bytes)"

# ---- Cache-bust stamping ----------------------------------------------------
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
