# Changelog

All notable changes to the Viv VS Code extension (`Viv DSL`) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.10.6] – 2026-04-10

### Changed

* Bump compatible compiler version to `0.11`.

## [0.10.5] – 2026-04-07

### Changed

* Add generic TextMate scope rules to all color themes, enabling syntax highlighting for non-Viv languages (JavaScript, Python, etc.).
* Update background color for `Viv Warm (Light)` theme (to match corresponding Sublime Text theme).

## [0.10.4] – 2026-03-31

### Changed

* Update icon and banner style.

## [0.10.3] – 2026-03-31

### Changed

* Revise README.

## [0.10.2] – 2026-03-31

### Changed

* Update icon and banner style.

## [0.10.1] – 2026-03-24

### Fixed

*  Target `viv-compiler 0.10` (placeholder remained).

## [0.10.0] – 2026-03-24

### Added

* One-click compiler installation when `viv-compiler` is not detected.
* One-click compiler update when the installed `viv-compiler` is outdated.
* `viv.compileOnSave` setting to toggle auto-compilation on save.
* `viv.compileTimeout` setting for configurable compiler timeout (default: 120 seconds).
* `queue plan-selector` boilerplate snippet.
* `phases` boilerplate snippet.
* `meta.external-name.viv` scope (in TextMate grammar) for host-defined identifiers (entity properties, enum labels, custom function names).

### Changed

* Target `viv-compiler 0.10` (previously `0.9`).
* Use the Python extension's active interpreter API, instead of the static `defaultInterpreterPath` setting, for Python interpreter resolution.

### Fixed

* Python interpreter resolution fell back to `python` instead of `python3` on systems with the Python extension but no explicit interpreter configured.
* Failed save would permanently disable compile-on-save for the rest of the session.
* Unclosed strings bled across lines, corrupting syntax highlighting for subsequent code.
* Version-mismatch warning was attached to the wrong file when an included file had an error.
* Version-mismatch warning was dropped in certain edge-case error handlers.
* Property and pointer names ending in hyphens were not fully highlighted.
* Auto-indentation rules triggered false dedents on words starting with `end`, `close`,
  or `else`.
* Compiler-version comparison failed on version strings with more than two
  dot-separated segments.
* `package-lock.json` leaked into published package.

### Security

* `viv.pythonPath` restricted to user settings only (cannot be overridden by workspace settings).

## [0.9.6] – 2026-03-21

### Changed

* Revise README.

## [0.9.5] – 2026-03-20

### Added

* `Cmd+R` / `Ctrl+R` keybinding for compile check (in addition to compile-on-save).

## [0.9.4] – 2026-03-20

### Changed

* Flatten changelog for Marketplace rendering.

## [0.9.3] – 2026-03-20

### Changed

* Revise README.

## [0.9.2] – 2026-03-20

### Changed

* Revise README.

## [0.9.1] – 2026-03-20

### Changed

* Revise README.
* Update extension icon.

## [0.9.0] – 2026-03-20

### Initial Release

* Syntax highlighting, with six bundled color themes.
* Compiler integration, with compile-on-save and a content-bundle build command.
* Status-bar indicator and inline diagnostics for compilation results.
* Content-bundle summary displayed in the `Output` panel tab after each successful compile.
* Error raised if compiler is not installed or not available.
* Warning issued if the compiler version doesn't match what the extension expects.
* Boilerplate snippets.
* Comment toggling, bracket matching, and auto-closing pairs.
* Auto-indentation.
