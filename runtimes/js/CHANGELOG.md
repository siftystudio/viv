# Changelog

All notable changes to the Viv JavaScript runtime (`@siftystudio/viv-runtime`) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.10.2] – 2026-04-07

### Added

* Requirements section in README.

## [0.10.1] – 2026-04-07

### Changed

* Raise minimum Node version (from 16 to 18).
* Update link to Viv homepage.

## [0.10.0] – 2026-03-30

### Added

* `api/analysis` module providing API functions for constructing causal tree diagrams.
* `hello-viv-js` example project.

### Fixed

* `actions` roles in sifting patterns could not duplicate one another or `roles` bindings (problematic when casting via sifting patterns).

## [0.9.2] – 2026-03-24

### Changed

* Revise README.

## [0.9.1] – 2026-03-24

### Changed

* Revise README.

## [0.9.0] – 2026-03-24

### Initial Release

* Full interpreter for the Viv DSL, including references, assignments, loops, conditionals, arithmetic, fail-safe chaining, and more.
* Action selection over both the general action library and queued actions, and also via forced targeting afforded by the `attemptAction` API function.
* Construct-agnostic role casting with backtracking, supporting optional roles, group roles, and custom casting pools.
* Action embargoes scoped by time windows, locations, and role-binding constraints.
* Rich reaction system with options for priority, urgency, spatiotemporal constraints, and repetition logic.
* Character memory formation with configurable salience, automatic memory fading (and forgetting) over time, and knowledge propagation (including via item inscription).
* Multi-phase plan execution over plan programs, represented as instruction tapes, with persistent resumable plan state and support for subplans.
* Story-sifting facilities including the execution of both query searches and full-fledged sifting patterns, over both character memories and the global chronicle.
* Causal bookkeeping in the form of automatic tracking of causal links between actions as they occur.
* Flexible host-application adapter interface with optional fast paths for optimizing frequent operations.
* Schema-based validation of compiled content bundles.
* Debugging and observability facilities such as construct watchlists, event callbacks, and structural validation of API calls.
* Custom error hierarchy of structured error types with rich diagnostic messages.
* Ships both ESM and CommonJS bundles, along with a rolled-up TypeScript declaration file.
