---
title: 1. Introduction
---

This chapter provides an overview of the Viv project before introducing the conventions that structure the language reference.

## Viv: Overview

Viv is a system for emergent narrative.

Using the DSL, an author defines the *actions* that *characters* can take in a simulated storyworld, along with material that enables *story sifting*—detecting causally related sequences of actions that represent storylines.

The authored constructs are compiled into a JSON file called the *content bundle*. To use a content bundle, the author integrates a Viv runtime into their project—the [host application](20-runtime-model.md#host-application)—and exposes read–write capabilities to the runtime via its [adapter](20-runtime-model.md#adapter). The runtime can then, for instance, evaluate preconditions by reading character data through the adapter, or execute effects by mutating that data.

### Architecture

A Viv project involves three components:

* **The DSL.** The language specified in this document. Authors write `.viv` source files.
* **The compiler.** Processes source files and produces a content bundle (a JSON file).
* **The runtime.** A library integrated into the host application. It consumes the content bundle and exposes an API for action selection, query execution, and sifting-pattern matching.

The host application simulates a world with characters in it. On each simulation tick, it may invoke the runtime to select actions for characters, and it may periodically run sifting patterns to identify emergent storylines.

## Reference Conventions

In this section, we describe the conventions used in the Viv language reference.

## Scope

This reference specifies the Viv DSL: its lexical structure, syntax, and semantics. It covers the compiler's output format and those aspects of runtime behavior that are relevant to understanding the language. It does not specify the runtime API, the adapter interface, or host-application integration patterns; those are covered in separate documentation.

## Normative language

When the keywords MUST, MUST NOT, SHALL, SHOULD, and MAY appear in this document, they are to be interpreted as carrying the special meanings described in [BCP 14](https://www.rfc-editor.org/bcp/bcp14.txt). These terms, when they are written in ALL CAPS, constrain implementations of the Viv language (compilers, runtimes), not authors of Viv code. When words like 'must' or 'may' are stylized normally, they carry their everyday meanings.

## Notation

Syntax is presented in a variant of extended Backus–Naur form (EBNF). Each section that introduces a syntactic construct opens with the relevant EBNF in a collapsible block.

The following conventions apply:

| Notation | Meaning |
|----------|---------|
| `"keyword"` | A literal keyword or token |
| `{ ... }` | Zero or more repetitions |
| `[ ... ]` | Optional |
| `\|` | Alternative |
| `(* ... *)` | Comment |

Code examples appear in `viv` fenced blocks. Where both legal and illegal examples are given, the distinction is marked in comments.

## Grammar overview

The Viv grammar is a parsing expression grammar (PEG). The root production is:

```ebnf
file = { include | action | selector | plan | query | sifting_pattern | trope } EOF .
```

A source file is a sequence of [include statements](04-includes.md) and construct definitions, which may appear in any order, including with [interleaving](03-file-structure.md#interleaving). Each construct type has a dedicated chapter in this reference:

| Construct | Chapter |
|-----------|---------|
| [Actions](10-actions.md) | 10 |
| [Tropes](14-tropes.md) | 14 |
| [Queries](15-queries.md) | 15 |
| [Sifting patterns](16-sifting-patterns.md) | 16 |
| [Plans](17-plans.md) | 17 |
| [Selectors](18-selectors.md) | 18 |