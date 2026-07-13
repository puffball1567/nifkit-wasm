#!/usr/bin/env bash
set -euo pipefail

package_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
core_dir=${NIFKIT_SOURCE_DIR:-"$package_dir/vendor/nifkit"}
emcc_bin=${EMCC:-$(command -v emcc || true)}

if [[ -z "$emcc_bin" ]]; then
  echo "emcc was not found. Install and activate Emscripten, or set EMCC=/path/to/emcc." >&2
  exit 1
fi

if [[ ! -f "$core_dir/src/nifkit_capi.nim" ]]; then
  echo "NIFKit core source not found at $core_dir. Clone with --recurse-submodules or set NIFKIT_SOURCE_DIR." >&2
  exit 1
fi

mkdir -p "$package_dir/dist" "$package_dir/nimcache"

# Emscripten needs a writable cache. This also keeps its generated files out of
# the user's home directory when the package is built in a sandbox or CI.
export EM_CACHE=${EM_CACHE:-"$package_dir/.emcache"}

nim c --cpu:wasm32 --cc:clang \
  --clang.exe:"$emcc_bin" \
  --clang.linkerexe:"$emcc_bin" \
  -d:release --hints:off --warnings:off \
  --nimcache:"$package_dir/nimcache" \
  --passL:-sMODULARIZE=1 \
  --passL:-sEXPORT_ES6=1 \
  --passL:-sENVIRONMENT=web,node \
  --passL:-sFILESYSTEM=0 \
  "--passL=-sEXPORTED_FUNCTIONS=['_malloc','_free','_nifkit_nif_to_bif','_nifkit_bif_to_nif','_nifkit_validate_bif','_nifkit_free','_nifkit_last_error']" \
  "--passL=-sEXPORTED_RUNTIME_METHODS=['UTF8ToString','HEAPU8','HEAPU32']" \
  -o:"$package_dir/dist/nifkit.generated.js" \
  "$core_dir/src/nifkit_capi.nim"

mv "$package_dir/dist/nifkit.generated.wasm" "$package_dir/dist/nifkit.wasm"
