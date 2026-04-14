#!/usr/bin/env bash
#
# Populate the Astro docs site with assets that live outside `docs/`.
#
# `docs/public/` and a couple of files under `docs/src/assets/` are gitignored
# because they are build-time copies of source-of-truth files that live in the
# monorepo-level `assets/` directory (or, for PDFs, in `docs/background/`).
#
# This script runs before every `astro dev` and `astro build` to re-populate them.
#
# If a new checked-in asset needs to land in the built site, a copy must be
# added via this script. Dropping files directly into `docs/public/` doesn't
# work, since they'll be silently lost on the next prebuild.

set -euo pipefail

cd "$(dirname "$0")/.."

mkdir -p public/background public/reference/language

# PDFs served under `/background/`
cp background/*.pdf public/background/

# Favicon
cp ../assets/viv-icon-light-256.png public/viv-icon.png

# Social preview image
cp ../assets/social-preview.png public/social-preview.png

# Starlight logo SVGs. These are consumed by the logo config in `astro.config.mjs`. They
# live in `src/assets/`, rather than `public/`, so that Astro can process them.
cp ../assets/viv-icon-dark.svg src/assets/viv-icon-dark.svg
cp ../assets/viv-icon-light.svg src/assets/viv-icon-light.svg

# Redirect `/reference/language/` to `/reference/language/00-preamble/`. This is a
# static HTML redirect rather than an Astro route because the language reference
# preamble lives at a numbered slug that readers wouldn't type.
cat > public/reference/language/index.html <<'EOF'
<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/reference/language/00-preamble/"></head><body></body></html>
EOF
