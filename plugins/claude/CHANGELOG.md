# Changelog

All notable changes to the Viv Claude Code plugin (`viv`) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.9.2] – 2026-04-08

### Changed

* `/viv:setup` rewritten: conversational flow with task list UI, consent gates, guided vs autopilot mode, and permissions setup.
* Orchestrator guide overhauled: monorepo map elevated to first-class protocol, sub-agent dispatching rules strengthened, token consciousness guidance added.
* `/viv:ask` now requires reading the orchestrator guide before answering (was optional, often skipped).
* Primer: removed unresolvable `${CLAUDE_PLUGIN_DATA}` path references, added version semantics section.
* README: recommend user scope for install, explain that a new session is required after install.

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
