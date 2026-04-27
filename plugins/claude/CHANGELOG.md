# Changelog

All notable changes to the Viv Claude Code plugin (`viv`) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.12.0] – 2026-04-27

### Added

* Shell command `viv-plugin-get-monorepo-map` for retrieving the monorepo map. This is needed because the map file is now stored outside the plugin files, as noted below.
* Shell command `viv-plugin-version` for retrieving the version of the plugin currently running.

### Changed

* Move the monorepo map out of the plugin files and into the larger Viv monorepo (at `docs/.llm/monorepo-map.md`). The plugin now uses the map file included in its monorepo copy. Previously any structural change to the monorepo necessitated a new plugin release, because the plugin's map file had to be updated in turn. With the map file now being external to the plugin, monorepo changes do not affect plugin versioning.
* Rewrite all plugin docs to route monorepo navigation through the map, rather than hardcoding monorepo paths.
* Update `/viv:sync` to detect when the plugin you're actually running is older than the latest version Claude Code has downloaded into its cache. This catches a known Claude Code bug where new versions get downloaded but the old one keeps running until the cache is manually cleared.
* Bump the minimum Claude Code version to `2.1.85` (for the `if`-filter hook syntax on which the plugin relies).
* Document WSL 2 as the supported Windows path. The plugin's bash-based utility commands don't run reliably under native Windows shells, due to open upstream issues in Claude Code's plugin infrastructure.

### Removed

* `monorepo-map` case from `viv-plugin-get-plugin-file`. Agents now use `viv-plugin-get-monorepo-map` instead.

### Fixed

* A failed fetch via `viv-plugin-fetch-monorepo` wiped the existing monorepo copy.
* `/viv:build` failed on its first tool call because `skills/build/SKILL.md` referenced `viv-plugin-get-doc`, which was renamed to `viv-plugin-get-plugin-file` in `0.11.0`.
* `viv-plugin-install-sublime-package` skipped dotfiles when copying source into the install directory, so `.no-sublime-package` never reached the destination. Also, reinstalls layered new content over previous installs without clearing stale files first.
* Auto-approval hooks matched as substrings, so a compound command like `rm -rf ~ && viv-plugin-orient` could still be auto-approved.
* Path validation in `viv-plugin-read-monorepo-file` and `viv-plugin-explore-monorepo` was lexical only, so a symlink under `$MONOREPO_DIR` pointing outside the sandbox would be silently followed.
* State files containing valid JSON that wasn't an object (lists, scalars, `null`) caused uncaught Python tracebacks in various plugin shell commands.

## [0.11.1] – 2026-04-14

### Changed

* Update monorepo map (a doc was renamed).

## [0.11.0] – 2026-04-14

### Added

* `-i`, `-l`, and `-c` flags for `viv-plugin-explore-monorepo grep`.
* Shell command `viv-plugin-check-latest` for retrieving the latest published versions of the Viv components (used by `/viv:sync`).

### Changed

* Emphasize `vivc --help` as the authoritative compiler reference in writer instructions, instead of enumerating flags that may drift from the installed compiler.
* Hoist `viv-plugin-explore-monorepo read` into its own command, `viv-plugin-read-monorepo-file`, to delineate exploration (`ls`, `grep`) and reading (`--offset`, `--limit`).
* Rename `viv-plugin-get-doc` to `viv-plugin-get-plugin-file` (agents were trying to use it to get monorepo docs).
* Make `/viv:sync` user-invocable and reframe it around upgrading all Viv components to their latest published versions (with downgrades and other complex syncs being possible but nonstandard usages).
* Update the monorepo map and primer to reflect the docs site overhaul.

### Fixed

* `viv-plugin-explore-monorepo grep` silently treated unsupported flags (e.g. `-l`) as the search pattern, scanning the wrong directory for the wrong string.
* Reading monorepo files silently tried to parse unsupported flags like `--offset` as positional line-number arguments, producing misleading "Invalid start line" errors.
* The test suite's `SKILL.md` frontmatter validator accepted unquoted values containing `": "` and values starting with YAML reserved characters.


## [0.10.0] – 2026-04-10

### Added

* `bin/` utility suite with twelve pre-approved shell commands giving Claude an optimized API surface for the operations it performs during sessions: orientation, monorepo browsing, plugin-state management, and Viv component installs.
* Defensive baseline for the `bin/` commands: path-traversal rejection, allowlist validation on lookups, atomic state writes, graceful failure on corrupted state, and symlink scrubbing on tarball extraction.
* Auto-approval hooks for the new `bin/` commands and also the `npm init` and `npm install` operations invoked during `/viv:setup`.
* Plugin ZIP archive attached to each GitHub Release, enabling local/offline installation workflows.
* Corpus of example `.viv` files demonstrating idiomatic Viv code, fetched via a `bin/` command.
* Test suite with 23 checks, wired into CI under both bash 5 and bash 3.2.
* Privacy policy (`PRIVACY.md`) covering what the plugin reads, writes, and sends over the network.

### Changed

* Move skill execution into the main conversation, populating the session with work that was previously hidden in subagents (forced by subagent work resumption still being experimental in Claude Code).
* Overhaul and polish onboarding flow for `/viv:setup`.
* Complete rewrite of all skill instructions, incorporating lessons from end-to-end testing and addressing common LLM pitfalls when writing Viv code.


## [0.9.2] – 2026-04-08

### Changed

* Overhaul `/viv:setup` UX: checklist UI, conversational vs. autopilot mode, consent gates for project changes.
* Tweak skill definitions to emphasize best practices for navigating the plugin data (namely the monorepo copy).
* Polish README.

## [0.9.1] – 2026-04-08

### Fixed

* Redundant hooks declaration in manifest caused a duplicate-load error.

## [0.9.0] – 2026-04-08

### Initial Release

* `/viv:setup` skill for guided project setup, including toolchain installation and editor plugin selection.
* `/viv:ask` skill for general conversation about Viv concerns.
* `/viv:write` skill for Viv code authoring from a brief, with compilation.
* `/viv:fix` skill for diagnosing and fixing compiler and runtime errors.
* `/viv:design` skill for architecting storyworlds, entity schemas, adapter code, and more.
* `/viv:study` skill for deep dives into Viv internals or your project's structure.
* `/viv:build` skill for writing adapters, test harnesses, and other integration code.
* `/viv:critique` skill for reviewing working code for optimization concerns, narrative potential, and style.
* `/viv:feedback` skill for reporting issues or suggestions to the Viv team.
* Automatic download of the Viv monorepo for reference material, with periodic syncing.
* Auto-approval hooks for compiler invocations.
* Self-hosted marketplace for direct GitHub installation.
