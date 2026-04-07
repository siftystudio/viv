---
title: 14. Tropes
---

<details>
<summary><i>EBNF</i></summary>

```ebnf
trope        = trope_header ":" trope_body .
trope_header = "trope" identifier .
trope_body   = (* unordered; roles required, conditions optional *)
               trope_roles
               [ trope_conditions ] .
trope_roles      = "roles" ":" role+ .
trope_conditions = "conditions" ":" statements .
```
</details>

A *trope definition*, or just *trope*, describes a relational pattern among [entities and symbols](05-entities-and-symbols.md) that can be tested at runtime. Tropes are named with an [identifier](02-lexical-elements.md#identifiers), and each trope in a [content bundle](19-compiler-output.md) must have a unique name.

## Trope header

<details>
<summary><i>EBNF</i></summary>

```ebnf
trope_header = "trope" identifier .
```
</details>

The *trope header* is introduced by the `trope` keyword, followed by the trope's name:

```viv
trope rivalry:
    ...
```

## Roles

<details>
<summary><i>EBNF</i></summary>

```ebnf
trope_roles = "roles" ":" role+ .
```
</details>

The *roles field* specifies one or more [role definitions](09-roles.md) that parameterize the trope. This field is required.

```viv
trope rivalry:
    roles:
        @hero:
            as: character
        @villain:
            as: character
    ...
```

## Conditions

<details>
<summary><i>EBNF</i></summary>

```ebnf
trope_conditions = "conditions" ":" statements .
```
</details>

The optional *conditions field* specifies a block of [statements](08-statements-and-control-flow.md) that must all evaluate to truthy values for the trope to be considered a match (a *fit*):

```viv
trope rivalry:
    roles:
        @hero:
            as: character
        @villain:
            as: character
    conditions:
        @hero.opinion[@villain] < -50
        @villain.opinion[@hero] < -50
```

## Trope fitting

A trope can be tested at runtime using a *trope fit* expression (see [Expressions](07-expressions.md#trope-fits)). The expression evaluates to a boolean indicating whether the trope's conditions hold for a given set of bindings:

```viv
// Standard form
fit trope rivalry:
    with:
        @hero: @person1
        @villain: @person2

// Sugared form
<@person1, @person2> fits trope rivalry
```

For full details on trope fit syntax, see [Expressions](07-expressions.md#trope-fits).
