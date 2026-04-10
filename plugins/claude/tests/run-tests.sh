#!/usr/bin/env bash
# plugins/claude/tests/run-tests.sh -- Test suite for the Viv Claude Code plugin
#
# Validates contracts the plugin depends on: bin script integrity, manifest validity,
# `SKILL.md` frontmatter, cross-reference resolution (every `viv-plugin-get-doc` and
# `viv-plugin-get-example` name in any markdown resolves to a real file), and the
# validity of all example `.viv` files (i.e., that they compile).
#
# The ethos here is that we exercise deterministic mechanism that would silently
# break the plugin, as opposed to stochastic concerns like agent behavior.
#
# Usage: bash plugins/claude/tests/run-tests.sh

# No -e: we want every check to run even if earlier checks fail
set -uo pipefail

PLUGIN_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BIN_DIR="$PLUGIN_DIR/bin"
DOCS_DIR="$PLUGIN_DIR/docs"
SKILLS_DIR="$PLUGIN_DIR/skills"
EXAMPLES_DIR="$DOCS_DIR/examples"

PASS=0
FAIL=0

pass() {
    PASS=$((PASS + 1))
    echo "PASS [$1]"
}

fail() {
    FAIL=$((FAIL + 1))
    echo "FAIL [$1]: $2" >&2
}

# Create a temp HOME with the minimal Viv plugin directory structure so tests
# can invoke bin/ scripts without touching the user's real plugin data. Prints
# the path on stdout. Caller is responsible for `rm -rf "$path"`.
make_temp_home() {
    local temp_home
    temp_home=$(mktemp -d)
    mkdir -p "$temp_home/.claude/plugins/data/viv-siftystudio/viv-monorepo"
    mkdir -p "$temp_home/.claude/plugins/cache/siftystudio/viv/0.10.0/docs/examples"
    mkdir -p "$temp_home/.claude/plugins/cache/siftystudio/viv/0.10.0/docs/agents"
    echo "test primer" > "$temp_home/.claude/plugins/cache/siftystudio/viv/0.10.0/docs/primer.md"
    echo "test main guide" > "$temp_home/.claude/plugins/cache/siftystudio/viv/0.10.0/docs/agents/main.md"
    echo "$temp_home"
}


# Check bin script integrity
check_bin_script_integrity() {
    local label="bin script integrity"
    local errors=()
    for script in "$BIN_DIR"/viv-plugin-*; do
        local name
        name=$(basename "$script")
        if [ ! -x "$script" ]; then
            errors+=("$name: not executable")
        fi
        if ! head -1 "$script" | grep -q "^#!/usr/bin/env bash"; then
            errors+=("$name: missing or wrong shebang")
        fi
        if ! bash -n "$script" 2>/dev/null; then
            errors+=("$name: bash syntax error")
        fi
    done
    if [ ${#errors[@]} -gt 0 ]; then
        fail "$label" "$(printf '%s; ' "${errors[@]}")"
    else
        pass "$label"
    fi
}


# Check bin scripts respond to --help
check_bin_script_help() {
    local label="bin script --help"
    local errors=()
    for script in "$BIN_DIR"/viv-plugin-*; do
        local name
        name=$(basename "$script")
        if ! "$script" --help >/dev/null 2>&1; then
            errors+=("$name: --help failed or non-zero exit")
        fi
    done
    if [ ${#errors[@]} -gt 0 ]; then
        fail "$label" "$(printf '%s; ' "${errors[@]}")"
    else
        pass "$label"
    fi
}


# Validate JSON manifests
check_plugin_manifest() {
    local label="plugin.json valid"
    local manifest="$PLUGIN_DIR/.claude-plugin/plugin.json"
    if [ ! -f "$manifest" ]; then
        fail "$label" "file not found"
        return
    fi
    if ! python3 -c "import json; data = json.load(open('$manifest')); assert 'name' in data; assert 'version' in data; assert 'description' in data" 2>/dev/null; then
        fail "$label" "invalid JSON or missing required field (name, version, description)"
        return
    fi
    pass "$label"
}

# Validate hooks manifest
check_hooks_manifest() {
    local label="hooks.json valid"
    local manifest="$PLUGIN_DIR/hooks/hooks.json"
    if [ ! -f "$manifest" ]; then
        fail "$label" "file not found"
        return
    fi
    if ! python3 -c "import json; json.load(open('$manifest'))" 2>/dev/null; then
        fail "$label" "invalid JSON"
        return
    fi
    pass "$label"
}


# Check SKILL.md frontmatter
check_skill_frontmatter() {
    local label="SKILL.md frontmatter"
    local errors=()
    for skill_file in "$SKILLS_DIR"/*/SKILL.md; do
        local skill_name
        skill_name=$(basename "$(dirname "$skill_file")")
        local result
        result=$(python3 -c "
import re
import sys
text = open('$skill_file').read()
if not text.startswith('---'):
    print('no frontmatter delimiter')
    sys.exit(1)
end = text.find('---', 3)
if end == -1:
    print('unclosed frontmatter')
    sys.exit(1)
fm = text[3:end]
# Verify name and description fields have non-empty values.
# Match a line like 'name: something' (with at least one non-whitespace char after the colon).
def has_field(field):
    pattern = r'^' + re.escape(field) + r':\s*(\S.*)$'
    for line in fm.splitlines():
        if re.match(pattern, line):
            return True
    return False
if not has_field('name'):
    print('missing or empty name field')
    sys.exit(1)
if not has_field('description'):
    print('missing or empty description field')
    sys.exit(1)
" 2>&1)
        if [ -n "$result" ]; then
            errors+=("$skill_name: $result")
        fi
    done
    if [ ${#errors[@]} -gt 0 ]; then
        fail "$label" "$(printf '%s; ' "${errors[@]}")"
    else
        pass "$label"
    fi
}


# Verify get-doc names resolve to real files
check_get_doc_names_resolve() {
    local label="get-doc names resolve"
    local script="$BIN_DIR/viv-plugin-get-doc"
    # Extract names from the case statement (lines like "    main)" or "    primer)")
    local errors=()
    while IFS= read -r name; do
        # Map name to expected file path (mirrors the script's case statement logic)
        local expected_path
        case "$name" in
            main)
                expected_path="$DOCS_DIR/agents/main.md"
                ;;
            primer)
                expected_path="$DOCS_DIR/primer.md"
                ;;
            monorepo-map)
                expected_path="$DOCS_DIR/monorepo-map.md"
                ;;
            web-links)
                expected_path="$DOCS_DIR/web-links.md"
                ;;
            writer|fixer|designer|researcher|engineer|critic)
                expected_path="$DOCS_DIR/agents/$name.md"
                ;;
            *)
                errors+=("unmapped name: $name")
                continue
                ;;
        esac
        if [ ! -f "$expected_path" ]; then
            errors+=("$name -> $expected_path (not found)")
        fi
    done < <(grep -E '^\s+[a-z][a-z-]*\)$' "$script" | sed 's/[[:space:]]*//; s/)$//')
    if [ ${#errors[@]} -gt 0 ]; then
        fail "$label" "$(printf '%s; ' "${errors[@]}")"
    else
        pass "$label"
    fi
}


# Verify get-example names resolve to real files
check_get_example_names_resolve() {
    local label="get-example names resolve"
    local script="$BIN_DIR/viv-plugin-get-example"
    local errors=()
    # Extract names from the listing (lines like '  echo "  bury-treasure ...').
    # Filter out the help text lines that mention the command itself (e.g.,
    # 'viv-plugin-get-example' as the leading word).
    while IFS= read -r name; do
        case "$name" in
            viv-plugin-*)
                continue
                ;;
        esac
        local expected_path="$EXAMPLES_DIR/$name.viv"
        if [ ! -f "$expected_path" ]; then
            errors+=("$name -> $expected_path (not found)")
        fi
    done < <(grep -oE 'echo "  [a-z][a-z-]+' "$script" | awk '{print $NF}')
    if [ ${#errors[@]} -gt 0 ]; then
        fail "$label" "$(printf '%s; ' "${errors[@]}")"
    else
        pass "$label"
    fi
}


# Validate get-doc references in markdown
check_get_doc_references_in_markdown() {
    local label="get-doc references in markdown"
    local errors=()
    # Find every viv-plugin-get-doc <name> reference in any markdown file.
    # A single line can have multiple references; process each one.
    while IFS= read -r line; do
        local file="${line%%:*}"
        local rest="${line#*:}"
        local relpath="${file#"$PLUGIN_DIR"/}"
        # Extract every name on this line (one per match, not just the first)
        while IFS= read -r name; do
            [ -z "$name" ] && continue
            case "$name" in
                main|primer|monorepo-map|web-links|writer|fixer|designer|researcher|engineer|critic)
                    ;;
                *)
                    errors+=("$relpath references unknown doc: $name")
                    ;;
            esac
        done < <(echo "$rest" | grep -oE 'viv-plugin-get-doc [a-z][a-z-]*' | awk '{print $2}')
    done < <(grep -rn 'viv-plugin-get-doc [a-z]' "$PLUGIN_DIR" --include='*.md' 2>/dev/null)
    if [ ${#errors[@]} -gt 0 ]; then
        fail "$label" "$(printf '%s; ' "${errors[@]}")"
    else
        pass "$label"
    fi
}


# Validate get-example references in markdown
check_get_example_references_in_markdown() {
    local label="get-example references in markdown"
    local errors=()
    # Find every viv-plugin-get-example <name> reference in any markdown file.
    # A single line can have multiple references; process each one.
    while IFS= read -r line; do
        local file="${line%%:*}"
        local rest="${line#*:}"
        local relpath="${file#"$PLUGIN_DIR"/}"
        while IFS= read -r name; do
            [ -z "$name" ] && continue
            # Skip flag-style references like "--all" or "--help"
            case "$name" in
                -*)
                    continue
                    ;;
            esac
            if [ ! -f "$EXAMPLES_DIR/$name.viv" ]; then
                errors+=("$relpath references unknown example: $name")
            fi
        done < <(echo "$rest" | grep -oE 'viv-plugin-get-example [a-z][a-z-]*' | awk '{print $2}')
    done < <(grep -rn 'viv-plugin-get-example [a-z]' "$PLUGIN_DIR" --include='*.md' 2>/dev/null)
    if [ ${#errors[@]} -gt 0 ]; then
        fail "$label" "$(printf '%s; ' "${errors[@]}")"
    else
        pass "$label"
    fi
}


# Verify example .viv files compile
check_examples_compile() {
    local label="examples compile"
    if ! command -v vivc >/dev/null 2>&1; then
        fail "$label" "vivc not on PATH (install the compiler before running tests)"
        return
    fi
    local errors=()
    for example in "$EXAMPLES_DIR"/*.viv; do
        local name
        name=$(basename "$example")
        if ! vivc --input "$example" >/dev/null 2>&1; then
            errors+=("$name: failed to compile")
        fi
    done
    if [ ${#errors[@]} -gt 0 ]; then
        fail "$label" "$(printf '%s; ' "${errors[@]}")"
    else
        pass "$label"
    fi
}


# Verify setup/SKILL.md step numbering is sequential
check_setup_skill_step_numbering() {
    local label="setup/SKILL.md step numbering sequential"
    local skill_file="$SKILLS_DIR/setup/SKILL.md"
    local errors=()
    local expected=1
    while IFS= read -r num; do
        if [ "$num" != "$expected" ]; then
            errors+=("expected Step $expected but found Step $num")
        fi
        expected=$((expected + 1))
    done < <(grep -oE '^## Step [0-9]+' "$skill_file" | sed -E 's/^## Step ([0-9]+)/\1/')
    if [ ${#errors[@]} -gt 0 ]; then
        fail "$label" "$(printf '%s; ' "${errors[@]}")"
    else
        pass "$label"
    fi
}


# Verify the doc table in main.md lists every name supported by viv-plugin-get-doc
check_main_md_lists_all_get_doc_names() {
    local label="main.md doc table lists all get-doc names"
    local main_md="$DOCS_DIR/agents/main.md"
    local script="$BIN_DIR/viv-plugin-get-doc"
    local errors=()
    while IFS= read -r name; do
        [ -z "$name" ] && continue
        if ! grep -q "$name" "$main_md"; then
            errors+=("name '$name' supported by script but not mentioned in main.md")
        fi
    done < <(grep -E '^\s+[a-z][a-z-]*\)$' "$script" | sed 's/[[:space:]]*//; s/)$//' | grep -v '^\*$')
    if [ ${#errors[@]} -gt 0 ]; then
        fail "$label" "$(printf '%s; ' "${errors[@]}")"
    else
        pass "$label"
    fi
}


# Verify viv-plugin-help mentions every flag supported by listed scripts
check_help_mentions_all_flags() {
    local label="viv-plugin-help mentions all flags from listed scripts"
    local help_output
    help_output=$("$BIN_DIR/viv-plugin-help" 2>&1)
    local errors=()
    for script_name in viv-plugin-fetch-monorepo viv-plugin-explore-monorepo viv-plugin-write-state; do
        local script_help
        script_help=$("$BIN_DIR/$script_name" --help 2>&1 || true)
        while IFS= read -r flag; do
            [ -z "$flag" ] && continue
            [ "$flag" = "--help" ] && continue
            if ! echo "$help_output" | grep -q -- "$flag"; then
                errors+=("$script_name supports $flag but viv-plugin-help doesn't mention it")
            fi
        done < <(echo "$script_help" | grep -oE -- '--[a-z][a-z-]*' | sort -u)
    done
    if [ ${#errors[@]} -gt 0 ]; then
        fail "$label" "$(printf '%s; ' "${errors[@]}")"
    else
        pass "$label"
    fi
}


# Verify writer.md example length claim matches actual example sizes
check_writer_md_example_length_claim() {
    local label="writer.md example length claim accurate"
    local writer_md="$DOCS_DIR/agents/writer.md"
    if ! grep -q '(~20 lines each)' "$writer_md"; then
        pass "$label"
        return
    fi
    local max_lines
    max_lines=$(wc -l "$EXAMPLES_DIR"/*.viv | grep -v total | awk '{print $1}' | sort -n | tail -1)
    # Allow up to 30 lines (50% over the claimed ~20)
    if [ "$max_lines" -gt 30 ]; then
        fail "$label" "claim says ~20 lines but max example is $max_lines lines"
    else
        pass "$label"
    fi
}


# Verify hooks.json auto-approves all bash commands invoked by bin/ scripts
check_hooks_cover_invoked_commands() {
    local label="hooks.json covers commands invoked by bin/ scripts"
    local errors=()
    if grep -q "npm install" "$BIN_DIR/viv-plugin-install-runtime"; then
        if ! grep -q '"Bash([^"]*npm install' "$PLUGIN_DIR/hooks/hooks.json"; then
            errors+=("install-runtime invokes 'npm install' but no matching hook")
        fi
    fi
    if grep -q "npm init" "$BIN_DIR/viv-plugin-install-runtime"; then
        if ! grep -q '"Bash([^"]*npm init' "$PLUGIN_DIR/hooks/hooks.json"; then
            errors+=("install-runtime invokes 'npm init' but no matching hook")
        fi
    fi
    if [ ${#errors[@]} -gt 0 ]; then
        fail "$label" "$(printf '%s; ' "${errors[@]}")"
    else
        pass "$label"
    fi
}


# Verify viv-plugin-fetch-monorepo populates state.json on fresh setup
check_fetch_monorepo_populates_state_on_fresh_setup() {
    local label="fetch-monorepo populates state.json on fresh setup"
    local script="$BIN_DIR/viv-plugin-fetch-monorepo"
    # The state update is currently gated on `if [ -f "$STATE_FILE" ]`, which
    # means a fresh run never populates state. After fix, state writes must
    # work regardless of whether state.json already exists.
    if grep -q 'if \[ -f "$STATE_FILE" \]' "$script"; then
        local lineno
        lineno=$(grep -n 'if \[ -f "$STATE_FILE" \]' "$script" | head -1 | cut -d: -f1)
        fail "$label" "state update gated on existing state.json (line $lineno)"
    else
        pass "$label"
    fi
}


# Verify viv-plugin-explore-monorepo refuses path traversal
check_explore_monorepo_refuses_path_traversal() {
    local label="explore-monorepo refuses path traversal"
    local test_home
    test_home=$(make_temp_home)
    echo "monorepo content" > "$test_home/.claude/plugins/data/viv-siftystudio/viv-monorepo/README.md"
    echo "SENTINEL_OUTSIDE_MONOREPO" > "$test_home/secret.txt"
    local errors=()
    # From monorepo dir to test_home is 5 ups: viv-monorepo -> siftystudio -> data -> plugins -> .claude -> test_home
    local output
    output=$(HOME="$test_home" "$BIN_DIR/viv-plugin-explore-monorepo" read "../../../../../secret.txt" 2>/dev/null || true)
    if echo "$output" | grep -q "SENTINEL_OUTSIDE_MONOREPO"; then
        errors+=("read: traversal succeeded")
    fi
    output=$(HOME="$test_home" "$BIN_DIR/viv-plugin-explore-monorepo" ls "../../../../.." 2>/dev/null || true)
    if echo "$output" | grep -q "secret.txt"; then
        errors+=("ls: traversal succeeded")
    fi
    rm -rf "$test_home"
    if [ ${#errors[@]} -gt 0 ]; then
        fail "$label" "$(printf '%s; ' "${errors[@]}")"
    else
        pass "$label"
    fi
}


# Verify viv-plugin-get-example refuses path traversal
check_get_example_refuses_path_traversal() {
    local label="get-example refuses path traversal"
    local test_home
    test_home=$(make_temp_home)
    local examples_dir="$test_home/.claude/plugins/cache/siftystudio/viv/0.10.0/docs/examples"
    echo "// safe" > "$examples_dir/safe-example.viv"
    echo "// SENTINEL_ATTACKER" > "$test_home/attacker.viv"
    # From examples dir to test_home is 8 ups
    local output
    output=$(HOME="$test_home" "$BIN_DIR/viv-plugin-get-example" "../../../../../../../../attacker" 2>/dev/null || true)
    rm -rf "$test_home"
    if echo "$output" | grep -q "SENTINEL_ATTACKER"; then
        fail "$label" "traversal succeeded — read attacker.viv"
    else
        pass "$label"
    fi
}


# Verify viv-plugin-get-doc rejects non-semver entries in cache
check_get_doc_rejects_non_semver_cache() {
    local label="get-doc rejects non-semver cache entries"
    local test_home
    test_home=$(mktemp -d)
    local cache_root="$test_home/.claude/plugins/cache/siftystudio/viv"
    mkdir -p "$cache_root/0.10.0/docs"
    echo "REAL_PRIMER" > "$cache_root/0.10.0/docs/primer.md"
    # Add a non-semver entry that would sort lexicographically later
    mkdir -p "$cache_root/zzz-not-a-version/docs"
    echo "WRONG_PRIMER" > "$cache_root/zzz-not-a-version/docs/primer.md"
    local output
    output=$(HOME="$test_home" "$BIN_DIR/viv-plugin-get-doc" primer 2>/dev/null || true)
    rm -rf "$test_home"
    if echo "$output" | grep -q "WRONG_PRIMER"; then
        fail "$label" "selected non-semver cache entry 'zzz-not-a-version'"
    else
        pass "$label"
    fi
}


# Verify corrupted state.json produces a graceful error, not a Python traceback
check_corrupted_state_graceful_error() {
    local label="corrupted state.json produces graceful error"
    local test_home
    test_home=$(make_temp_home)
    echo "{ this is not valid JSON" > "$test_home/.claude/plugins/data/viv-siftystudio/state.json"
    local errors=()
    local output
    output=$(HOME="$test_home" "$BIN_DIR/viv-plugin-read-state" 2>&1 || true)
    if echo "$output" | grep -q "Traceback (most recent call last)"; then
        errors+=("read-state dumped traceback")
    fi
    output=$(HOME="$test_home" "$BIN_DIR/viv-plugin-orient" 2>&1 || true)
    if echo "$output" | grep -q "Traceback (most recent call last)"; then
        errors+=("orient dumped traceback")
    fi
    rm -rf "$test_home"
    if [ ${#errors[@]} -gt 0 ]; then
        fail "$label" "$(printf '%s; ' "${errors[@]}")"
    else
        pass "$label"
    fi
}


# Verify every doc file has a viv-plugin-get-doc case statement entry
check_get_doc_case_statement_complete() {
    local label="get-doc case statement covers all doc files"
    local script="$BIN_DIR/viv-plugin-get-doc"
    local errors=()
    # Extract names from the script's case statement.
    local script_names
    script_names=$(grep -E '^\s+[a-z][a-z-]*\)$' "$script" | sed 's/[[:space:]]*//; s/)$//')
    # For each markdown file in docs/agents/ and the top-level docs/, verify
    # there's a corresponding case branch.
    for doc in "$DOCS_DIR"/agents/*.md "$DOCS_DIR"/primer.md "$DOCS_DIR"/monorepo-map.md "$DOCS_DIR"/web-links.md; do
        local name
        name=$(basename "$doc" .md)
        if ! echo "$script_names" | grep -q "^${name}$"; then
            errors+=("doc file '$name.md' has no case branch in viv-plugin-get-doc")
        fi
    done
    if [ ${#errors[@]} -gt 0 ]; then
        fail "$label" "$(printf '%s; ' "${errors[@]}")"
    else
        pass "$label"
    fi
}


# Verify SKILL.md frontmatter parses as valid YAML
check_skill_frontmatter_yaml_valid() {
    local label="SKILL.md frontmatter is valid YAML"
    local errors=()
    for skill_file in "$SKILLS_DIR"/*/SKILL.md; do
        local skill_name
        skill_name=$(basename "$(dirname "$skill_file")")
        local result
        result=$(SKILL_FILE="$skill_file" python3 <<'PY' 2>&1
import os
import sys
text = open(os.environ['SKILL_FILE']).read()
if not text.startswith('---'):
    print('no frontmatter delimiter')
    sys.exit(1)
end = text.find('---', 3)
if end == -1:
    print('unclosed frontmatter')
    sys.exit(1)
fm = text[3:end]
# Pure-stdlib YAML validation: parse line-by-line, check that each non-blank
# line is `key: value` with balanced quotes. Sufficient for the simple
# frontmatter we use (no nested structures, no multiline values).
for lineno, line in enumerate(fm.splitlines(), start=1):
    stripped = line.strip()
    if not stripped or stripped.startswith('#'):
        continue
    if ':' not in stripped:
        print(f'line {lineno}: missing colon')
        sys.exit(1)
    key, _, value = stripped.partition(':')
    if not key.strip():
        print(f'line {lineno}: empty key')
        sys.exit(1)
    value = value.strip()
    # Check balanced quotes if the value starts with one
    if value.startswith('"') and not (len(value) >= 2 and value.endswith('"')):
        print(f'line {lineno}: unbalanced double quote')
        sys.exit(1)
    if value.startswith("'") and not (len(value) >= 2 and value.endswith("'")):
        print(f'line {lineno}: unbalanced single quote')
        sys.exit(1)
PY
)
        if [ -n "$result" ]; then
            errors+=("$skill_name: $result")
        fi
    done
    if [ ${#errors[@]} -gt 0 ]; then
        fail "$label" "$(printf '%s; ' "${errors[@]}")"
    else
        pass "$label"
    fi
}


# Verify viv-plugin-write-state --init produces a graceful error on bad JSON
check_write_state_init_graceful_error() {
    local label="write-state --init graceful error on bad JSON"
    local test_home
    test_home=$(make_temp_home)
    local output
    output=$(HOME="$test_home" "$BIN_DIR/viv-plugin-write-state" --init '{ not valid json' 2>&1 || true)
    rm -rf "$test_home"
    if echo "$output" | grep -q "Traceback (most recent call last)"; then
        fail "$label" "dumped Python traceback"
    else
        pass "$label"
    fi
}


# Run all checks

CHECKS=(
    check_bin_script_integrity
    check_bin_script_help
    check_plugin_manifest
    check_hooks_manifest
    check_skill_frontmatter
    check_get_doc_names_resolve
    check_get_example_names_resolve
    check_get_doc_references_in_markdown
    check_get_example_references_in_markdown
    check_examples_compile
    check_setup_skill_step_numbering
    check_main_md_lists_all_get_doc_names
    check_help_mentions_all_flags
    check_writer_md_example_length_claim
    check_hooks_cover_invoked_commands
    check_fetch_monorepo_populates_state_on_fresh_setup
    check_explore_monorepo_refuses_path_traversal
    check_get_example_refuses_path_traversal
    check_get_doc_rejects_non_semver_cache
    check_corrupted_state_graceful_error
    check_write_state_init_graceful_error
    check_get_doc_case_statement_complete
    check_skill_frontmatter_yaml_valid
)

for check in "${CHECKS[@]}"; do
    "$check"
done

EXPECTED=${#CHECKS[@]}
TOTAL=$((PASS + FAIL))

echo ""
echo "$PASS passed, $FAIL failed"

if [ "$TOTAL" -ne "$EXPECTED" ]; then
    echo "ERROR: expected $EXPECTED checks but only $TOTAL ran -- a check function failed silently" >&2
    exit 1
fi

exit $((FAIL > 0 ? 1 : 0))
