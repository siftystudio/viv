---
title: 19. Compiler output
---

The [Viv compiler](/reference/compiler/) processes one or more source files (after resolving [includes](04-includes.md)), via a single [entry file](#entry-file), and produces a single JSON file called the *content bundle*. This chapter describes the structure of that output.

## Entry file

The *entry file* is the Viv source file passed to the compiler as input. The compiler parses it, recursively resolves any [include statements](04-includes.md), and merges all resulting construct definitions into a single combined representation before proceeding with validation, postprocessing, and bundling. The entry file's path is used as the base for resolving relative include paths.

## Content bundle

A *content bundle* is the compiled artifact consumed by a Viv runtime. It is a JSON object with the following top-level keys:

| Key | Type | Contents |
|-----|------|----------|
| `metadata` | object | [Bundle metadata](#metadata) |
| `actions` | object | [Action definitions](10-actions.md), keyed by name |
| `actionSelectors` | object | [Action-selector definitions](18-selectors.md), keyed by name |
| `plans` | object | [Plan definitions](17-plans.md), keyed by name |
| `queries` | object | [Query definitions](15-queries.md), keyed by name |
| `siftingPatterns` | object | [Sifting-pattern definitions](16-sifting-patterns.md), keyed by name |
| `planSelectors` | object | [Plan-selector definitions](18-selectors.md), keyed by name |
| `tropes` | object | [Trope definitions](14-tropes.md), keyed by name |

[Template actions](10-actions.md#template-marker) are excluded from the content bundle, as they exist solely for inheritance purposes.

## Metadata

The *metadata* object carries version information and validation data:

| Field | Type | Purpose |
|-------|------|---------|
| `schemaVersion` | string | The Viv content-bundle schema version. Runtimes enforce compatibility against this. |
| `compilerVersion` | string | The compiler version that produced this bundle, for provenance. |
| `grammarVersion` | string | The DSL grammar version at compile time, for provenance. |
| `referencedEnums` | string[] | Names of all [enums](02-lexical-elements.md#enums) referenced in the bundle, used for adapter validation. |
| `referencedFunctionNames` | string[] | Names of all [adapter functions](07-expressions.md#custom-function-calls) referenced in the bundle, used for adapter validation. |
| `timeOfDayParameterizedReactions` | object[] | Records of reactions constrained by [time of day](12-temporal-constraints.md#time-of-day-constraints), used for adapter validation. |
| `timeOfDayParameterizedQueries` | string[] | Names of queries parameterized by time of day, used for adapter validation. |
| `hasEntityDataAssignments` | boolean | Whether the bundle contains any [assignment](07-expressions.md#assignments) that modifies entity data. Some adapter configurations disallow this. |

## Compiled expressions

Expressions in the content bundle are represented as JSON objects with a `type` discriminator field identifying the expression kind. The shapes of these compiled expressions are defined by the DSL types (see `dsl_types.py` in the compiler source).

## Versioning

The `schemaVersion` field in the metadata ensures that a content bundle is compatible with the runtime consuming it. A runtime [MUST](01-introduction.md#normative-language) check this version during initialization and reject bundles with incompatible schema versions.
