#!/usr/bin/env bash
# scripts/bump-semver-string.sh -- Bump a semver string (none|patch|minor|major)

set -euo pipefail

BUMP="$1"
CURRENT="$2"

if [ "$BUMP" = "none" ]; then
    echo "$CURRENT"
    exit 0
fi

# Strip any pre-release suffix (e.g., "1.2.3-beta.1" → "1.2.3")
CURRENT_BASE="${CURRENT%%-*}"
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_BASE"

case "$BUMP" in
    patch) PATCH=$((PATCH + 1)) ;;
    minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
    major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
    *) echo "Invalid bump argument: $BUMP (expected none|patch|minor|major)" >&2 && exit 1 ;;
esac

echo "$MAJOR.$MINOR.$PATCH"
