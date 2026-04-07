#!/usr/bin/env bash
# scripts/extract-changelog.sh -- Extract a release's changelog entry
#
# Reads a Keep a Changelog file and prints the body text under the heading that
# matches the supplied version. Exits non-zero if no matching entry exists.
#
# Usage: extract-changelog.sh <version> <changelog-path>
#
# The version string is escaped for awk regex before matching, so dots and
# other metacharacters in semver or pre-release versions are handled safely.

set -euo pipefail

VERSION="$1"
CHANGELOG="$2"

# Escape regex metacharacters so that the version matches literally in awk
ESCAPED=$(echo "$VERSION" | sed 's/[.+*?^${}()|\\[]/\\&/g')

# Print lines between the matching ## [$VERSION] heading and the next ## [
BODY=$(awk "/^## \\[$ESCAPED\\]/{found=1; next} /^## \\[/{if(found) exit} found{print}" "$CHANGELOG")

if [ -z "$BODY" ]; then
    echo "No changelog entry found for version $VERSION in $CHANGELOG" >&2
    exit 1
fi

echo "$BODY"
