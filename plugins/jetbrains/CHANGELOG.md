# Changelog

All notable changes to the Viv JetBrains plugin (`Viv`) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.9.6] – 2026-03-31

### Changed

* Update icons.

## [0.9.5] – 2026-03-30

### Changed

* Revise Marketplace listing copy.

## [0.9.4] – 2026-03-30

### Changed

* Revise Marketplace listing copy.

## [0.9.3] – 2026-03-30

### Changed

* Revise Marketplace listing copy.

## [0.9.2] – 2026-03-30

### Changed

* Revise Marketplace listing copy.

## [0.9.1] – 2026-03-30

### Changed

* Revise Marketplace listing copy.

## [0.9.0] – 2026-03-30

### Initial Release

* Native syntax highlighting via JFlex lexer and PSI annotator, with six bundled color themes. Full syntax coloring in any JetBrains theme (Darcula, IntelliJ Light, etc.) with no configuration needed.
* GrammarKit parser and JFlex lexer for full PSI tree support.
* PSI-based file indexer via IntelliJ's `FileBasedIndex` framework (persistent, dumb-mode safe, no manual reindexing).
* `PsiReference`-based go-to-declaration for constructs, roles, scratch variables, local variables, custom functions, enum tokens, tags, properties, include paths, and selector candidates.
* Inline rename refactoring for all identifier types, with type-aware project-wide renaming for constructs, enums, tags, and functions.
* `Find Usages` and highlight usages for all identifier types.
* Context-aware autocompletion for roles (including inherited ones), scratch variables, local variables, enum tokens, custom functions, construct names, and selector candidates.
* Rich hover documentation using IntelliJ's `DocumentationMarkup` API, with structured popups for all identifier types. Clickable cross-reference links that chain between popups.
* Data-driven keyword tooltips (150+ entries) covering the entire Viv language. Hover over any keyword to see what it means.
* Block keyword matching: click `if`/`elif`/`else`/`end` to highlight the full block. Also works for `loop`/`end`, `for`/`end`, and reaction windows (`all`/`any`/`untracked` and `close`). In plans, clicking on the plan name highlights any `succeed`/`fail` instructions in the plan, and clicking a phase name highlights control-flow keywords in the phase.
* Inheritance gutter icons for child actions.
* `Structure` view with constructs, roles, scratch variables, and plan phases.
* Breadcrumbs showing current construct, section, and role.
* Code folding for construct bodies and also section blocks.
* Compiler-driven and static inline diagnostics (the latter applying to undefined construct references and duplicate definitions).
* Compiler integration, with compile-on-save and a build command (`Save Content Bundle`).
* Status-bar indicator and inline diagnostics for compilation results.
* One-click compiler installation when `viv-compiler` is not detected.
* One-click compiler update when the installed `viv-compiler` is outdated.
* Warning issued if the compiler version doesn't match what the plugin expects.
* Boilerplate snippets (JetBrains Live Templates).
* Comment toggling, bracket matching, and auto-closing pairs.
* Auto-indentation.
