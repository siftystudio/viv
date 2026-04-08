#!/usr/bin/env bash
# scripts/release.sh -- Tag and push a release for a Viv package
#
# Creates an annotated git tag and pushes it to origin, triggering the
# corresponding CD workflow. Verifies the version against the package
# manifest and confirms a changelog entry exists before tagging.
#
# Usage: release.sh <package> <version>
#        release.sh --delete <package> <version>
#
# Packages: compiler, runtime, sublime, vscode, jetbrains, claude

set -euo pipefail

die() { echo "" >&2; echo "$1" >&2; echo "" >&2; exit 1; }
say() { echo ""; echo "$1"; echo ""; }

# Handle --delete mode
DELETE=false
if [ "${1:-}" = "--delete" ]; then
    DELETE=true
    shift
fi

if [ $# -ne 2 ]; then
    echo "" >&2
    echo "Usage: release.sh <package> <version>" >&2
    echo "       release.sh --delete <package> <version>" >&2
    echo "Packages: compiler, runtime, sublime, vscode, jetbrains, claude" >&2
    echo "" >&2
    exit 1
fi

PACKAGE="$1"
VERSION="$2"

# Resolve the monorepo root from this script's location
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Map package names to tag prefixes
case "$PACKAGE" in
    compiler)   TAG="compiler-v$VERSION" ;;
    runtime)    TAG="runtime-v$VERSION" ;;
    sublime)    TAG="sublime-v$VERSION" ;;
    vscode)     TAG="vscode-v$VERSION" ;;
    jetbrains)  TAG="jetbrains-v$VERSION" ;;
    claude)     TAG="claude-v$VERSION" ;;
    *)          die "Unknown package: $PACKAGE (valid: compiler, runtime, sublime, vscode, jetbrains, claude)" ;;
esac

# Delete mode -- remove the GitHub Release and tag, then exit
if [ "$DELETE" = true ]; then
    echo ""
    read -p "Delete release and tag for $TAG? [y/N] " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        die "Aborted."
    fi
    echo ""
    echo "Deleting release and tag for $TAG..."
    echo ""
    gh release delete "$TAG" --repo siftystudio/viv --yes 2>/dev/null && echo "- Deleted GitHub Release." || echo "- No GitHub Release found."
    git -C "$ROOT" push origin --delete "$TAG" 2>/dev/null && echo "- Deleted remote tag." || echo "- No remote tag found."
    git -C "$ROOT" tag -d "$TAG" 2>/dev/null && echo "- Deleted local tag." || echo "- No local tag found."
    say "Done."
    exit 0
fi

# Map package names to manifest paths, version commands, and formal names
case "$PACKAGE" in
    compiler)
        MANIFEST="$ROOT/compiler/pyproject.toml"
        MANIFEST_VERSION=$(sed -n 's/^version = "\(.*\)"/\1/p' "$MANIFEST")
        CHANGELOG="$ROOT/compiler/CHANGELOG.md"
        FORMAL_NAME="Viv Compiler v$VERSION"
        ;;
    runtime)
        MANIFEST="$ROOT/runtimes/js/package.json"
        MANIFEST_VERSION=$(node -e "console.log(require('$MANIFEST').version)")
        CHANGELOG="$ROOT/runtimes/js/CHANGELOG.md"
        FORMAL_NAME="Viv JavaScript Runtime v$VERSION"
        ;;
    sublime)
        MANIFEST="$ROOT/plugins/sublime/repository.json"
        MANIFEST_VERSION=$(python3 -c "import json; print(json.load(open('$MANIFEST'))['packages'][0]['releases'][0]['version'])")
        CHANGELOG="$ROOT/plugins/sublime/CHANGELOG.md"
        FORMAL_NAME="Viv Sublime Text Package v$VERSION"
        ;;
    vscode)
        MANIFEST="$ROOT/plugins/vscode/package.json"
        MANIFEST_VERSION=$(node -e "console.log(require('$MANIFEST').version)")
        CHANGELOG="$ROOT/plugins/vscode/CHANGELOG.md"
        FORMAL_NAME="Viv VS Code Extension v$VERSION"
        ;;
    jetbrains)
        MANIFEST="$ROOT/plugins/jetbrains/gradle.properties"
        MANIFEST_VERSION=$(grep '^pluginVersion' "$MANIFEST" | cut -d= -f2 | tr -d ' ')
        CHANGELOG="$ROOT/plugins/jetbrains/CHANGELOG.md"
        FORMAL_NAME="Viv JetBrains Plugin v$VERSION"
        ;;
    claude)
        MANIFEST="$ROOT/plugins/claude/.claude-plugin/plugin.json"
        MANIFEST_VERSION=$(python3 -c "import json; print(json.load(open('$MANIFEST'))['version'])")
        CHANGELOG="$ROOT/plugins/claude/CHANGELOG.md"
        FORMAL_NAME="Viv Claude Code Plugin v$VERSION"
        ;;
esac

# Ensure version matches manifest
if [ "$MANIFEST_VERSION" != "$VERSION" ]; then
    die "Version mismatch: $MANIFEST says $MANIFEST_VERSION, you said $VERSION"
fi

# Ensure changelog entry exists
"$ROOT/scripts/extract-changelog.sh" "$VERSION" "$CHANGELOG" > /dev/null

# Ensure we're on main
BRANCH=$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
    die "Not on main (currently on $BRANCH)"
fi

# Ensure working tree is clean
if [ -n "$(git -C "$ROOT" status --porcelain)" ]; then
    die "Working tree is not clean -- commit or stash changes first"
fi

# Ensure HEAD is pushed
LOCAL=$(git -C "$ROOT" rev-parse HEAD)
REMOTE=$(git -C "$ROOT" rev-parse origin/main 2>/dev/null || echo "unknown")
if [ "$LOCAL" != "$REMOTE" ]; then
    die "Local main is not in sync with origin/main -- push first"
fi

# Tag and push
say "Tagging $TAG ($FORMAL_NAME)"
git -C "$ROOT" tag -a "$TAG" -m "$FORMAL_NAME"
git -C "$ROOT" push origin "$TAG"

# Wait for the CD workflow to appear, then stream its status
echo ""
echo "Waiting for CD workflow to start..."
sleep 5
run_id=$(gh run list --repo siftystudio/viv --limit 5 --json databaseId,headBranch,event,status -q ".[] | select(.headBranch==\"$TAG\") | .databaseId" 2>/dev/null | head -1)
if [ -n "$run_id" ]; then
    gh run watch "$run_id" --repo siftystudio/viv
    echo ""
    gh run view "$run_id" --repo siftystudio/viv
    echo ""
else
    say "Could not find the CD workflow run. Check https://github.com/siftystudio/viv/actions."
fi
