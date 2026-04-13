# Changelog

All notable changes to the Viv Claude Code plugin (`viv`) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

* `-i`, `-l`, and `-c` flags for `viv-plugin-explore-monorepo grep`.

### Changed

* Hoist `vivc --help` as the authoritative compiler reference in writer instructions, instead of enumerating flags that drift from the installed compiler.

### Fixed

* `viv-plugin-explore-monorepo grep` silently treated unsupported flags (e.g. `-l`) as the search pattern, scanning the wrong directory for the wrong string.


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
