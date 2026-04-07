#!/usr/bin/env python3

"""Cross-component sync checks for the Viv monorepo (used for CI)."""

import json
import re
import sys
from pathlib import Path
from typing import Final


# Absolute path to the monorepo root
ROOT: Final = Path(__file__).resolve().parent.parent

# Example projects that ship compiled content bundles
HELLO_VIV_EXAMPLES: Final = ["hello-viv-ts", "hello-viv-js"]


def check_content_bundle_schema() -> bool:
    """Verify that the compiler and runtime copies of the content-bundle schema are identical."""
    compiler_path = ROOT / "compiler/src/viv_compiler/schemas/content-bundle.schema.json"
    runtime_path = ROOT / "runtimes/js/src/schemas/content-bundle.schema.json"
    compiler_text = compiler_path.read_text()
    runtime_text = runtime_path.read_text()
    if compiler_text != runtime_text:
        print("FAIL [content-bundle schema]: compiler and runtime copies differ")
        return False
    version = json.loads(compiler_text).get("version")
    print(f"PASS [content-bundle schema]: copies match (v{version})")
    return True


def check_compiler_version_in_plugins() -> bool:
    """Verify that all plugins' `compilerVersion` major.minor matches the compiler's and each other's."""
    # Read the compiler's own version
    pyproject_text = (ROOT / "compiler/pyproject.toml").read_text()
    compiler_match = re.search(r'version\s*=\s*"([^"]+)"', pyproject_text)
    if not compiler_match:
        print("FAIL [compiler version in plugins]: could not parse version from pyproject.toml")
        return False
    compiler_major_minor = ".".join(compiler_match.group(1).split(".")[:2])
    # Read plugin compilerVersion fields
    sublime_meta = json.loads((ROOT / "plugins/sublime/repository.json").read_text())
    sublime_version = sublime_meta["packages"][0].get("compilerVersion")
    if not sublime_version:
        print("FAIL [compiler version in plugins]: compilerVersion not found in repository.json")
        return False
    sublime_major_minor = ".".join(sublime_version.split(".")[:2])
    vscode_meta = json.loads((ROOT / "plugins/vscode/package.json").read_text())
    vscode_version = vscode_meta.get("compilerVersion")
    if not vscode_version:
        print("FAIL [compiler version in plugins]: compilerVersion not found in VS Code package.json")
        return False
    vscode_major_minor = ".".join(vscode_version.split(".")[:2])
    jetbrains_props = (ROOT / "plugins/jetbrains/gradle.properties").read_text()
    jetbrains_match = re.search(r"^compilerVersion\s*=\s*(.+)$", jetbrains_props, re.MULTILINE)
    if not jetbrains_match:
        print("FAIL [compiler version in plugins]: compilerVersion not found in gradle.properties")
        return False
    jetbrains_version = jetbrains_match.group(1).strip()
    jetbrains_major_minor = ".".join(jetbrains_version.split(".")[:2])
    # All major.minor values must agree
    if sublime_major_minor != compiler_major_minor:
        print(f"FAIL [compiler version in plugins]: "
              f"Sublime compilerVersion {sublime_version} does not match compiler {compiler_match.group(1)} (major.minor)")
        return False
    if vscode_major_minor != compiler_major_minor:
        print(f"FAIL [compiler version in plugins]: "
              f"VS Code compilerVersion {vscode_version} does not match compiler {compiler_match.group(1)} (major.minor)")
        return False
    if jetbrains_major_minor != compiler_major_minor:
        print(f"FAIL [compiler version in plugins]: "
              f"JetBrains compilerVersion {jetbrains_version} does not match compiler {compiler_match.group(1)} (major.minor)")
        return False
    print(f"PASS [compiler version in plugins]: {compiler_major_minor}")
    return True


def _extract_grammar_keywords() -> set[str]:
    """Extract keyword-shaped string literals from the PEG grammar."""
    peg_text = (ROOT / "compiler/src/viv_compiler/grammar/viv.peg").read_text()
    keywords = set()
    for line in peg_text.splitlines():
        # Strip comments from // to end of line. Not string-aware, but safe
        # because no PEG quoted literal contains the // character sequence.
        comment_pos = line.find("//")
        if comment_pos >= 0:
            line = line[:comment_pos]
        # Match "..." and '...' not preceded by r
        for regex_match in re.finditer(r'(?<!r)"([^"]*)"', line):
            keywords.add(regex_match.group(1))
        for regex_match in re.finditer(r"(?<!r)'([^']*)'", line):
            keywords.add(regex_match.group(1))
    # Keep only keyword-shaped strings: lowercase alpha with optional hyphens, min length 2
    keyword_pattern = re.compile(r"^[a-z][a-z-]+$")
    return {keyword for keyword in keywords if keyword_pattern.match(keyword)}


def check_keywords() -> bool:
    """Verify that all grammar keywords appear in both syntax definitions."""
    keywords = _extract_grammar_keywords()
    sublime_text = (ROOT / "plugins/sublime/Viv.sublime-syntax").read_text()
    textmate_text = (ROOT / "syntax/viv.tmLanguage.json").read_text()
    # Check Sublime syntax (word-boundary matching to avoid false positives from substrings).
    # A keyword is considered present if it matches as a whole word, or if the syntax contains
    # a regex like "keyword + s?" that subsumes it (e.g., "minutes?" covers both "minute" and "minutes").
    # Check all syntax files, accumulating failures across all of them
    all_passed = True
    missing_sublime = sorted(
        keyword for keyword in keywords
        if not re.search(r"\b" + re.escape(keyword) + r"\b", sublime_text)
        and keyword + "s?" not in sublime_text
    )
    if missing_sublime:
        print(f"FAIL [keywords]: {len(missing_sublime)} keyword(s) in grammar but not in Sublime syntax:")
        for keyword in missing_sublime:
            print(f"  - {keyword}")
        all_passed = False
    # Check TextMate grammar
    missing_textmate = sorted(
        keyword for keyword in keywords
        if not re.search(r"\b" + re.escape(keyword) + r"\b", textmate_text)
        and keyword + "s?" not in textmate_text
    )
    if missing_textmate:
        print(f"FAIL [keywords]: {len(missing_textmate)} keyword(s) in grammar but not in TextMate grammar:")
        for keyword in missing_textmate:
            print(f"  - {keyword}")
        all_passed = False
    # Check JetBrains grammar (Viv.bnf + Viv.flex)
    jetbrains_bnf = (ROOT / "plugins/jetbrains/src/main/grammar/Viv.bnf").read_text()
    jetbrains_flex = (ROOT / "plugins/jetbrains/src/main/grammar/Viv.flex").read_text()
    jetbrains_combined = jetbrains_bnf + "\n" + jetbrains_flex
    missing_jetbrains = sorted(
        keyword for keyword in keywords
        if not re.search(r"\b" + re.escape(keyword) + r"\b", jetbrains_combined)
        and keyword + "s?" not in jetbrains_combined
    )
    if missing_jetbrains:
        print(f"FAIL [keywords]: {len(missing_jetbrains)} keyword(s) in grammar but not in JetBrains grammar:")
        for keyword in missing_jetbrains:
            print(f"  - {keyword}")
        all_passed = False
    if all_passed:
        print(f"PASS [keywords]: all {len(keywords)} grammar keywords found in all syntax files")
    return all_passed


def check_sublime_repository_url() -> bool:
    """Verify that the download URL in `repository.json` embeds the correct version."""
    meta = json.loads((ROOT / "plugins/sublime/repository.json").read_text())
    release = meta["packages"][0]["releases"][0]
    version = release["version"]
    url = release["url"]
    expected_fragment = f"sublime-v{version}"
    if expected_fragment not in url:
        print(f"FAIL [sublime repository URL]: version is {version} but URL is {url}")
        return False
    print(f"PASS [sublime repository URL]: URL matches version {version}")
    return True


def _check_hello_viv_runtime_dep(example: str) -> bool:
    """Verify that the runtime version satisfies a hello-viv example's dependency constraint."""
    runtime = json.loads((ROOT / "runtimes/js/package.json").read_text())
    runtime_version = runtime["version"]
    # Strip pre-release suffix (e.g., "0.10.0-beta.1" → "0.10.0")
    runtime_base = runtime_version.split("-")[0]
    runtime_parts = runtime_base.split(".")
    runtime_major = int(runtime_parts[0])
    runtime_minor = int(runtime_parts[1])
    runtime_patch = int(runtime_parts[2])
    label = f"{example} runtime dep"
    hello_viv = json.loads((ROOT / f"examples/{example}/package.json").read_text())
    constraint = hello_viv.get("dependencies", {}).get("@siftystudio/viv-runtime")
    if not constraint:
        print(f"FAIL [{label}]: @siftystudio/viv-runtime not found in dependencies")
        return False
    # Parse caret constraint (^X.Y.Z) per npm semver rules:
    # - ^0.Y.Z means >=0.Y.Z <0.(Y+1).0 (major.minor must match)
    # - ^X.Y.Z (X>=1) means >=X.Y.Z <(X+1).0.0 (major must match)
    constraint_match = re.match(r"\^(\d+)\.(\d+)\.(\d+)", constraint)
    if not constraint_match:
        print(f"FAIL [{label}]: could not parse constraint {constraint}")
        return False
    constraint_major = int(constraint_match.group(1))
    constraint_minor = int(constraint_match.group(2))
    constraint_patch = int(constraint_match.group(3))
    if constraint_major == 0 and constraint_minor == 0:
        # ^0.0.Z: exact match only (>=0.0.Z <0.0.(Z+1))
        compatible = (runtime_major == 0
                      and runtime_minor == 0
                      and runtime_patch == constraint_patch)
    elif constraint_major == 0:
        # ^0.Y.Z: major.minor must match, patch must be >= constraint
        compatible = (runtime_major == constraint_major
                      and runtime_minor == constraint_minor
                      and runtime_patch >= constraint_patch)
    else:
        # 1.x+ range: major must match, (minor, patch) must be >= constraint
        runtime_tuple = (runtime_minor, runtime_patch)
        constraint_tuple = (constraint_minor, constraint_patch)
        compatible = runtime_major == constraint_major and runtime_tuple >= constraint_tuple
    if not compatible:
        print(f"FAIL [{label}]: constraint {constraint} does not accept runtime {runtime_version}")
        return False
    print(f"PASS [{label}]: {constraint} accepts {runtime_version}")
    return True


def _check_hello_viv_schema_version(example: str) -> bool:
    """Verify that a hello-viv example's bundle has the current schema version."""
    schema = json.loads(
        (ROOT / "runtimes/js/src/schemas/content-bundle.schema.json").read_text()
    )
    expected = schema["version"]
    label = f"{example} schema"
    bundle_path = ROOT / f"examples/{example}/src/content/compiled_content_bundle.json"
    if not bundle_path.exists():
        print(f"FAIL [{label}]: bundle not found at {bundle_path.relative_to(ROOT)}")
        return False
    bundle = json.loads(bundle_path.read_text())
    schema_version = bundle.get("metadata", {}).get("schemaVersion")
    if schema_version != expected:
        print(f"FAIL [{label}]: has {schema_version}, expected {expected}")
        return False
    print(f"PASS [{label}]: {expected}")
    return True


def check_language_reference_version() -> bool:
    """Verify that the language reference preamble cites the current grammar major.minor."""
    peg_text = (ROOT / "compiler/src/viv_compiler/grammar/viv.peg").read_text()
    peg_match = re.search(r"//\s*VERSION:\s*(\S+)", peg_text)
    if not peg_match:
        print("FAIL [language reference version]: could not parse version from viv.peg")
        return False
    grammar_major_minor = ".".join(peg_match.group(1).split(".")[:2])
    preamble_text = (ROOT / "docs/reference/language/00-preamble.md").read_text()
    preamble_match = re.search(r"version\s+`([^`]+)`", preamble_text)
    if not preamble_match:
        print("FAIL [language reference version]: could not find version in preamble")
        return False
    preamble_version = preamble_match.group(1)
    if preamble_version != grammar_major_minor:
        print(f"FAIL [language reference version]: preamble says {preamble_version}, grammar is {grammar_major_minor}")
        return False
    print(f"PASS [language reference version]: {preamble_version}")
    return True


def check_monorepo_map_paths() -> bool:
    """Verify that all paths in the Claude Code plugin's monorepo map resolve to existing files."""
    map_path = ROOT / "plugins/claude/docs/monorepo-map.md"
    text = map_path.read_text()
    # Extract paths from the `Where` column of markdown tables: | ... | `path/to/file` | ... |
    paths = re.findall(r"\|\s*`([^`]+)`\s*\|", text)
    if not paths:
        print("PASS [monorepo map paths]: no paths found")
        return True
    missing = []
    for rel_path in paths:
        # Handle directory references (trailing /) and wildcards
        if rel_path.endswith("/"):
            if not (ROOT / rel_path).is_dir():
                missing.append(rel_path)
        else:
            if not (ROOT / rel_path).exists():
                missing.append(rel_path)
    if missing:
        print(f"FAIL [monorepo map paths]: {len(missing)} path(s) not found:")
        for rel_path in missing:
            print(f"  - {rel_path}")
        return False
    print(f"PASS [monorepo map paths]: all {len(paths)} paths resolve")
    return True


def check_changelog_paths() -> bool:
    """Verify that relative Markdown links in the root `CHANGELOG.md` resolve to existing files."""
    changelog_path = ROOT / "CHANGELOG.md"
    text = changelog_path.read_text()
    # Match relative paths in markdown links, excluding URLs
    paths = re.findall(r"\]\((?!\w+://)(?:\./)?([^)]+)\)", text)
    if not paths:
        print("PASS [changelog paths]: no relative paths found")
        return True
    # Strip fragment identifiers (e.g., "file.md#section" → "file.md")
    missing = [rel_path for rel_path in paths
               if not (ROOT / rel_path.split("#")[0]).exists()]
    if missing:
        print(f"FAIL [changelog paths]: {len(missing)} path(s) not found:")
        for rel_path in missing:
            print(f"  - {rel_path}")
        return False
    print(f"PASS [changelog paths]: all {len(paths)} paths resolve")
    return True


def _make_named_check(name: str, func, *args):
    """Create a named wrapper around a check function for better error reporting."""
    def wrapper():
        return func(*args)
    wrapper.__name__ = name
    return wrapper


def main() -> None:
    """Run all sync checks and exit with a nonzero code if any fail."""
    checks = [
        check_content_bundle_schema,
        check_compiler_version_in_plugins,
        check_keywords,
        check_sublime_repository_url,
        *[_make_named_check(f"check_{ex.replace('-', '_')}_runtime_dep", _check_hello_viv_runtime_dep, ex)
          for ex in HELLO_VIV_EXAMPLES],
        *[_make_named_check(f"check_{ex.replace('-', '_')}_schema", _check_hello_viv_schema_version, ex)
          for ex in HELLO_VIV_EXAMPLES],
        check_language_reference_version,
        check_monorepo_map_paths,
        check_changelog_paths,
    ]
    passed = 0
    failed = 0
    for check in checks:
        try:
            if check():
                passed += 1
            else:
                failed += 1
        except Exception as exc:
            print(f"FAIL [{check.__name__}]: unhandled error: {exc}")
            failed += 1
    print(f"\n{passed} passed, {failed} failed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
