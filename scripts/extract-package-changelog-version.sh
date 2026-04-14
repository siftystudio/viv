#!/usr/bin/env bash
# scripts/extract-package-changelog-version.sh -- Print the topmost version in a package's changelog
#
# Reads the most recent version heading from the package's CHANGELOG.md and
# prints just the version (the contents of the `[...]` in `## [X.Y.Z]`).
# If the top heading is `## [Unreleased]`, prints "Unreleased". Prints nothing
# if the changelog has no version headings.
#
# Usage: extract-package-changelog-version.sh <package>
#
# Packages: compiler, runtime, sublime, vscode, jetbrains, claude

set -euo pipefail

if [ $# -ne 1 ]; then
    echo "Usage: extract-package-changelog-version.sh <package>" >&2
    exit 1
fi

PACKAGE="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

case "$PACKAGE" in
    compiler)   CHANGELOG="$ROOT/compiler/CHANGELOG.md" ;;
    runtime)    CHANGELOG="$ROOT/runtimes/js/CHANGELOG.md" ;;
    sublime)    CHANGELOG="$ROOT/plugins/sublime/CHANGELOG.md" ;;
    vscode)     CHANGELOG="$ROOT/plugins/vscode/CHANGELOG.md" ;;
    jetbrains)  CHANGELOG="$ROOT/plugins/jetbrains/CHANGELOG.md" ;;
    claude)     CHANGELOG="$ROOT/plugins/claude/CHANGELOG.md" ;;
    *)
        echo "Unknown package: $PACKAGE (valid: compiler, runtime, sublime, vscode, jetbrains, claude)" >&2
        exit 1
        ;;
esac

awk '/^## \[/{gsub(/^## \[|\].*/, ""); print; exit}' "$CHANGELOG"
