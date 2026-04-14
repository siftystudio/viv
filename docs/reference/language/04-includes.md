---
title: 4. Includes
---

<details>
<summary><i>EBNF</i></summary>

```ebnf
include   = "include" target .
target    = '"' file_char { file_char } '"'
          | "'" file_char { file_char } "'" .
file_char = letter | digit | "_" | "-" | "." | "/" .
```
</details>

File importing is supported through *include statements*, or just *includes*, which specify paths to other Viv files whose [construct definitions](03-file-structure.md) will be merged into the one at hand.

## Targets

An author can specify either a filename, a relative path, or an absolute path as the *target* of an include. An include can only have a single target, so multiple statements are required to import multiple files.

## File paths

Viv file paths use the forward-slash (`/`) character as the directory separator, regardless of the host operating system. The compiler [SHALL](01-introduction.md#normative-language) map such paths onto the underlying filesystem conventions.

## Path resolution

If an include [target](#targets) is a filename or a relative path, path resolution is required for the compiler to load its contents. Such path resolution always depends on the file in which the include statement appears, not the [entry file](19-compiler-output.md#entry-file) that was submitted to the compiler.

Here's some example code showing how path resolution works in Viv:

```viv
// Must be a file in the same directory as this file
include "tropes.viv"

// Path is treated as relative to this file
include "../tropes/tropes.viv"

// No resolution required
include "/Users/vivian/Documents/viv/tropes/tropes.viv"
```

## Recursive includes

Consider the case of a file `A` being the [entry file](19-compiler-output.md#entry-file) submitted to the compiler. If `A` includes a file `B`, which itself includes a file `C`, the contents of all three will be merged. Of course, there is directionality here, such that submitting `B` to the compiler would only cause `C` to be included.

## Idempotency

A given file will be processed only once, even if it is included multiple times in the course of resolving recursive includes.

## Circular dependencies

Circular dependencies are permitted. For example, if a file `A` includes `B`, and `B` includes `A`, the result would be `A` and `B` merged, with no duplicates (and no compiler error).

## Concatenated source

The final result of include handling is a *concatenated source*, where all the constructs encountered during the recursive search are included, with no duplication. (At this point, includes have been handled and thus [MAY](01-introduction.md#normative-language) be discarded.) As noted in their respective chapters, uniqueness among construct names is enforced in a concatenated source.

## Concatenated source units are orderless

As noted [previously](03-file-structure.md#source-units-are-orderless), the constructs within a source file are conceptually orderless. This is also the case in a concatenated source.

## Errors

If a specified file cannot be found, the compiler will halt with an error indicating the path of the nonexistent include target.
