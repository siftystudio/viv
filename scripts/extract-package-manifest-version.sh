#!/usr/bin/env bash
# scripts/extract-package-manifest-version.sh -- Print a package's manifest version
#
# Reads the version from the package's canonical manifest file (pyproject.toml,
# package.json, gradle.properties, plugin.json, etc.) and prints it to stdout.
# Shared by release.sh and the preflight sync checks so there's one place to
# change when a manifest format or path moves.
#
# Usage: extract-package-manifest-version.sh <package>
#
# Packages: compiler, runtime, sublime, vscode, jetbrains, claude

set -euo pipefail

if [ $# -ne 1 ]; then
    echo "Usage: extract-package-manifest-version.sh <package>" >&2
    exit 1
fi

PACKAGE="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

case "$PACKAGE" in
    compiler)   sed -n 's/^version = "\(.*\)"/\1/p' "$ROOT/compiler/pyproject.toml" ;;
    runtime)    node -e "console.log(require('$ROOT/runtimes/js/package.json').version)" ;;
    sublime)    python3 -c "import json; print(json.load(open('$ROOT/plugins/sublime/repository.json'))['packages'][0]['releases'][0]['version'])" ;;
    vscode)     node -e "console.log(require('$ROOT/plugins/vscode/package.json').version)" ;;
    jetbrains)  grep '^pluginVersion' "$ROOT/plugins/jetbrains/gradle.properties" | cut -d= -f2 | tr -d ' ' ;;
    claude)     python3 -c "import json; print(json.load(open('$ROOT/plugins/claude/.claude-plugin/plugin.json'))['version'])" ;;
    *)
        echo "Unknown package: $PACKAGE (valid: compiler, runtime, sublime, vscode, jetbrains, claude)" >&2
        exit 1
        ;;
esac
