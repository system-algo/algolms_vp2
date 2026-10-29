#!/usr/bin/env bash
# Downloads the official prebuilt Scratch GUI (scratchfoundation/scratch-gui, gh-pages, BSD-3-Clause)
# into public/vp-assets/scratch-gui and adds editor.html, which loads the captured VP projects.
# Fails soft: the VP player shows a notice when the editor is missing.
set -u
cd "$(dirname "$0")/.."
OUT=public/vp-assets/scratch-gui
if [ -f "$OUT/gui.js" ] && [ -f "$OUT/editor.html" ] && [ "${1:-}" != "--force" ]; then echo "scratch-gui already present"; exit 0; fi
TMP=$(mktemp -d)
if ! git clone -q --depth 1 --branch gh-pages https://github.com/scratchfoundation/scratch-gui.git "$TMP/gui"; then
  echo "WARN: could not download scratch-gui; Scratch levels will show a notice" >&2; exit 0
fi
rm -rf "$OUT"; mkdir -p "$OUT"
cp "$TMP/gui/gui.js" "$TMP/gui/extension-worker.js" "$OUT/"
cp "$TMP/gui/gui.js.LICENSE.txt" "$OUT/" 2>/dev/null || true
cp -r "$TMP/gui/chunks" "$TMP/gui/static" "$OUT/"
cp "$TMP/gui/"*.hex "$OUT/" 2>/dev/null || true
find "$OUT" -name '*.map' -delete
# The bundled fetch-worker loader hardcodes publicPath "/" - make it relative to gui.js so the GUI works under any base path.
python3 - "$OUT/gui.js" <<'PY'
import sys,re
p=sys.argv[1]; s=open(p,encoding='utf8').read()
new='.p=(typeof document!=="undefined"&&document.currentScript&&document.currentScript.src?document.currentScript.src.replace(/[^\/]*$/,""):"/")'
s,n=re.subn(r'(__nested_webpack_require_\d+__)\.p="/"',lambda m:m.group(1)+new,s)
open(p,'w',encoding='utf8').write(s); print("patched publicPath x%d"%n)
PY
cp scripts/vp-scratch-editor.html "$OUT/editor.html"
W=$(grep -o 'fetch-worker\.[a-f0-9]*\.js' "$OUT/gui.js" | head -1)
[ -n "$W" ] && cp scripts/vp-scratch-fetch-worker.js "$OUT/chunks/$W"
rm -rf "$TMP"
echo "scratch-gui installed in $OUT"
