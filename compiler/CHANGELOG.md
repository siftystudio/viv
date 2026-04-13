# Changelog

All notable changes to the Viv compiler (`viv-compiler`) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

* Validation check flagging `.viv` extensions on the CLI's `--output` argument.
* Validation check flagging `--output` paths that resolve to the same file as `--input`.

### Fixed

* Passing a directory for the CLI's `--output` argument raised an internal-error traceback instead of a friendly `VivCompileError`.

## [0.11.0] – 2026-04-10

### Added

* `compile_from_string()` API function for compiling Viv source code directly from a string, without a file on disk. Accepts an optional `entry_dir` for resolving include paths (defaults to the current working directory).
* `--string` and `--entry-dir` CLI flags, exposing the new compile-from-string affordance.
* Validation check flagging `inscribe` and `inspect` expressions with operands of the wrong type.
* Validation check flagging bare `as: character` role labels in actions and action selectors (where a participation mode like `initiator`, `partner`, `recipient`, or `bystander` is required).

## [0.10.4] – 2026-04-07

### Changed

* Use relative paths in source annotations on expressions in compiled content bundles.

### Fixed

* The grammar version was not bumped to reflect various grammar changes.

## [0.10.3] – 2026-03-31

### Changed

* Revise README.

## [0.10.2] – 2026-03-30

### Added

* Validation check flagging action-relation operators (e.g., `causes`) with group-role operands.

### Changed

* Tokenize multi-token keywords (`in order` and `with weights`) as two separate keywords (to allow authors to use whitespace freely).

### Fixed

* Group roles were not allowed in the `actions` field of sifting patterns.

## [0.10.1] – 2026-03-24

### Changed

* Revise README.

## [0.10.0] – 2026-03-24

### Changed

* Bump `__schema_version__` from `0.9.0` to `0.10.0`.
* Rename field (`ReactionRepeatLogic.maxInstances` to `ReactionRepeatLogic.maxRepeats`).
* Change type for `VivCompileError.file_path` from `str | None` to `Path | None` (now consistent with `VivParseError`).

### Fixed

* `VivParseError.file_path` was always `None`.
* `VivParseError.__str__` produced progressively duplicated output on repeated calls.
* `--default-importance` and `--default-salience` CLI flags were silently ignored.
* `join <field>:` on a standalone action (with no `parent`) silently succeeded instead of raising an error.
* `@hearer` in conditions caused a `KeyError` crash (now yields validation error).
* `StopIteration` crash when a selector candidate lacks an initiator role.
* Duplicate-operand detection in query fields and reaction `location` never fired.
* Edge case around `@this` and `@hearer` in non-action constructs.
* Crash on bare `@this.scratch` references (with no path).
* Error message for reaction prevalidation mixed up usages of `"effects"` and `"reactions"`.
* Error message for prohibited search-domain policy mixed up usages of `"action search"` and `"sifting"`.

## [0.9.1] – 2026-03-22

### Fixed

* JSON output was nondeterministic when writing content bundles to file.

## [0.9.0] – 2026-03-21

### Initial Release

* Compiles Viv source files (`.viv`) into JSON content bundles conforming to the `ContentBundle` schema.
* Supports all seven construct types: actions, action selectors, plans, plan selectors, queries, sifting patterns, and tropes.
* Full expression language, action inheritance, modular source files via `include` statements, and semantic validation with source-annotated error messages.
* Command-line interface (`vivc`) with output filtering, construct listing, and various flags.
* Python API exposing compiler entry function, custom exception hierarchy, and custom types.
