# Changelog

All notable changes to the Viv Sublime Text package (`Viv`) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.11.0] – 2026-04-18

### Changed

* Invoke `py -3` (the Python launcher) instead of `python` on Windows (more reliable).

## [0.10.1] – 2026-04-18

### Changed

* Bump compatible compiler version to `0.12`.

## [0.10.0] – 2026-04-16

### Added

* README instructions for applying a Viv color scheme to `.viv` files only.

### Changed

* Rename bundled color schemes directory from `themes/` to `schemes/` to align with Sublime Text's terminology.

## [0.9.1] – 2026-04-10

### Changed

* Bump compatible compiler version to `0.11`.

## [0.9.0] – 2026-04-07

### Initial Release

* Syntax highlighting, with six bundled color schemes.
* Compiler integration via the Sublime build system, with clickable error locations.
* Error raised if compiler is not installed or not available.
* Warning issued if the compiler version doesn't match what the package expects.
* Autocompletion and boilerplate snippets.
* Auto-indentation.
