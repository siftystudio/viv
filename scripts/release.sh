#!/usr/bin/env bash
# scripts/release.sh -- Tag and push a release for a Viv package
#
# Creates an annotated git tag and pushes it to origin, triggering the
# corresponding CD workflow. Verifies the version against the package
# manifest and confirms a changelog entry exists before tagging.
#
# Usage: release.sh <package> <version>
#        release.sh --delete <package> <version>
#        release.sh --check
#
# Packages: compiler, runtime, sublime, vscode, jetbrains, claude

set -euo pipefail

# Print an error message to stderr, padded with blank lines, and exit 1
die() { echo "" >&2; echo "$1" >&2; echo "" >&2; exit 1; }

# Print a status message to stdout, padded with blank lines
say() { echo ""; echo "$1"; echo ""; }

# Parse mode flags
DELETE=false
CHECK=false
if [ "${1:-}" = "--delete" ]; then
    DELETE=true
    shift
elif [ "${1:-}" = "--check" ]; then
    CHECK=true
    shift
fi

# Resolve the monorepo root from this script's location
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

ALL_PACKAGES=(compiler runtime sublime vscode jetbrains claude)

# Read the current version from a package's manifest
manifest_version_for() {
    case "$1" in
        compiler)   sed -n 's/^version = "\(.*\)"/\1/p' "$ROOT/compiler/pyproject.toml" ;;
        runtime)    node -e "console.log(require('$ROOT/runtimes/js/package.json').version)" ;;
        sublime)    python3 -c "import json; print(json.load(open('$ROOT/plugins/sublime/repository.json'))['packages'][0]['releases'][0]['version'])" ;;
        vscode)     node -e "console.log(require('$ROOT/plugins/vscode/package.json').version)" ;;
        jetbrains)  grep '^pluginVersion' "$ROOT/plugins/jetbrains/gradle.properties" | cut -d= -f2 | tr -d ' ' ;;
        claude)     python3 -c "import json; print(json.load(open('$ROOT/plugins/claude/.claude-plugin/plugin.json'))['version'])" ;;
    esac
}

# Resolve the changelog path for a package
changelog_for() {
    case "$1" in
        compiler)   echo "$ROOT/compiler/CHANGELOG.md" ;;
        runtime)    echo "$ROOT/runtimes/js/CHANGELOG.md" ;;
        sublime)    echo "$ROOT/plugins/sublime/CHANGELOG.md" ;;
        vscode)     echo "$ROOT/plugins/vscode/CHANGELOG.md" ;;
        jetbrains)  echo "$ROOT/plugins/jetbrains/CHANGELOG.md" ;;
        claude)     echo "$ROOT/plugins/claude/CHANGELOG.md" ;;
    esac
}

# Resolve the source directory for a package, relative to ROOT
path_for() {
    case "$1" in
        compiler)   echo "compiler" ;;
        runtime)    echo "runtimes/js" ;;
        sublime)    echo "plugins/sublime" ;;
        vscode)     echo "plugins/vscode" ;;
        jetbrains)  echo "plugins/jetbrains" ;;
        claude)     echo "plugins/claude" ;;
    esac
}

# Read the topmost version heading from a package's changelog
changelog_latest_for() {
    awk '/^## \[/{gsub(/^## \[|\].*/, ""); print; exit}' "$(changelog_for "$1")"
}

# --check mode -- per package, show changelog/manifest/released
# versions and unreleased commit count, with stale cells in red
if [ "$CHECK" = true ]; then
    if [ $# -ne 0 ]; then
        die "Usage: release.sh --check (takes no arguments)"
    fi
    say "Fetching tags from origin..."
    git -C "$ROOT" fetch --tags --quiet origin
    # Set up color codes only when stdout is a terminal
    if [ -t 1 ]; then
        RED=$'\033[31m'
        RESET=$'\033[0m'
    else
        RED=""
        RESET=""
    fi
    # Render a fixed-width version cell, red if it's below the row's max
    cell() {
        local value="$1" max="$2" color=""
        if [ -n "$max" ] && [ "$value" != "$max" ]; then
            color="$RED"
        fi
        printf '%s%-8s%s' "$color" "$value" "$RESET"
    }
    for pkg in "${ALL_PACKAGES[@]}"; do
        cl_version=$(changelog_latest_for "$pkg")
        [ -z "$cl_version" ] && cl_version="none"
        current=$(manifest_version_for "$pkg")
        latest_tag=$(git -C "$ROOT" tag -l "${pkg}-v*" --sort=-v:refname | head -1)
        if [ -n "$latest_tag" ]; then
            released="${latest_tag#${pkg}-v}"
            commit_range="${latest_tag}..HEAD"
        else
            released="none"
            commit_range="HEAD"
        fi
        commits=$(git -C "$ROOT" rev-list --count "$commit_range" -- "$(path_for "$pkg")")
        case "$commits" in
            0)  commits_label="up to date" ;;
            1)  commits_label="1 unreleased commit" ;;
            *)  commits_label="$commits unreleased commits" ;;
        esac
        # Compute the row's max version, ignoring "none", to mark stale cells
        max_version=$(printf '%s\n%s\n%s\n' "$cl_version" "$current" "$released" \
            | grep -v '^none$' | sort -V | tail -1)
        printf "  %-10s changelog %s current %s released %s %s\n" \
            "$pkg" \
            "$(cell "$cl_version" "$max_version")" \
            "$(cell "$current"    "$max_version")" \
            "$(cell "$released"   "$max_version")" \
            "$commits_label"
    done
    echo ""
    exit 0
fi

if [ $# -ne 2 ]; then
    echo "" >&2
    echo "Usage: release.sh <package> <version>" >&2
    echo "       release.sh --delete <package> <version>" >&2
    echo "       release.sh --check" >&2
    echo "Packages: compiler, runtime, sublime, vscode, jetbrains, claude" >&2
    echo "" >&2
    exit 1
fi

PACKAGE="$1"
VERSION="$2"

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

# Map package names to manifest paths and formal names
case "$PACKAGE" in
    compiler)   MANIFEST="$ROOT/compiler/pyproject.toml";                   FORMAL_NAME="Viv Compiler v$VERSION" ;;
    runtime)    MANIFEST="$ROOT/runtimes/js/package.json";                  FORMAL_NAME="Viv JavaScript Runtime v$VERSION" ;;
    sublime)    MANIFEST="$ROOT/plugins/sublime/repository.json";           FORMAL_NAME="Viv Sublime Text Package v$VERSION" ;;
    vscode)     MANIFEST="$ROOT/plugins/vscode/package.json";               FORMAL_NAME="Viv VS Code Extension v$VERSION" ;;
    jetbrains)  MANIFEST="$ROOT/plugins/jetbrains/gradle.properties";       FORMAL_NAME="Viv JetBrains Plugin v$VERSION" ;;
    claude)     MANIFEST="$ROOT/plugins/claude/.claude-plugin/plugin.json"; FORMAL_NAME="Viv Claude Code Plugin v$VERSION" ;;
esac
MANIFEST_VERSION=$(manifest_version_for "$PACKAGE")
CHANGELOG=$(changelog_for "$PACKAGE")

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
