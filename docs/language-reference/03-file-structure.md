---
title: 3. File structure
---

<details>
<summary><i>EBNF</i></summary>

```ebnf
file = { include | action | selector | plan | query | sifting_pattern | trope } EOF .
```
</details>

A Viv source file (`.viv`) is a sequence of zero or more [include statements](04-includes.md) and *construct definitions*, a catch-all term for [action definitions](10-actions.md), [selector definitions](18-selectors.md), [plan definitions](17-plans.md), [query definitions](15-queries.md), [sifting-pattern definitions](16-sifting-patterns.md), and [trope definitions](14-tropes.md).

## Empty files

In Viv, empty files, including files containing only whitespace or comments, are valid code:

```viv
```

```viv
// Empty files are valid
```

## Interleaving

The various constructs may appear in any order, and interleaving is allowed. As such, a structure like this is syntactically valid:

```viv
include ...

action ...

trope ...

query ...

action ...

include ...

plan ...
```

## Source units are orderless

Despite being written in a certain order, the constructs in a source file are conceptually *orderless*. An action may inherit from another action that is defined below it within the same file. Likewise, it may target such an action in a [reaction](11-reactions.md). The file-importing process, implemented via [includes](04-includes.md), also [treats these concerns as orderless](04-includes.md#concatenated-source-units-are-orderless).
