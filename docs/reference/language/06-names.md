---
title: 6. Names
---

This chapter describes how [sigils](02-lexical-elements.md#sigils), [identifiers](02-lexical-elements.md#identifiers), and [decorators](02-lexical-elements.md#sigils) combine to form names for roles and variables.

## Names

<details>
<summary><i>EBNF</i></summary>

```ebnf
name = [ scope_sigil ] type_sigil identifier [ group_role_decorator ] .
scope_sigil          = "$" | "_" .
type_sigil           = "@" | "&" .
group_role_decorator = "*" .
```
</details>

A *name* is how an author declares, and later refers to, a [role](09-roles.md),  [scratch variable](10-actions.md#scratch), or [local variable](08-statements-and-control-flow.md#local-variables) that binds a particular value.

It combines the following components, in order:

1. An optional [scope sigil](#scope-sigils) (`$` or `_`).
2. A [type sigil](#type-sigils) (`@` or `&`).
3. An [identifier](#identifier).
4. An optional [group-role decorator](#group-role-decorator) (`*`).

## Scope sigils

An optional *scope sigil* marks the storage scope of a variable:

| Sigil | Name | Usage |
|-------|------|-------|
| `$` | Scratch sigil | Prefix on [scratch variables](10-actions.md#scratch), which persist across the fields of an action. |
| `_` | Local sigil | Prefix on [local variables](08-statements-and-control-flow.md#local-variables), which are scoped to a single block (e.g., a loop body). |
|  | (neither) | When no scope sigil is present, the name refers to a [role](09-roles.md).|

When included in a name, the scope sigil must be present on both its initial [declaration](#declarations) and any subsequent [references](#references) to it.

A scope sigil, when present, appears before the type sigil in a name.

## Type sigils

The required *type sigil* marks whether the name binds an [entity](05-entities-and-symbols.md#entities) or a [symbol](05-entities-and-symbols.md#symbols):

| Sigil | Name | Usage |
|-------|------|-------|
| `@` | Entity sigil | Prefix on roles/variables that bind characters, items, locations, or actions. |
| `&` | Symbol sigil | Prefix on roles/variables that bind symbols. |

The type sigil must be present on both the initial [declaration](#declarations) of a name and any subsequent [references](#references) to it. 

A type sigil always appears immediately before the [identifier](02-lexical-elements.md#identifiers) in a name.

## Identifier

At the heart of a name is an [identifier](02-lexical-elements.md#identifiers).

For example, in the name `@friends*`, the identifier is `friends`.

## Group-role decorator

The *group-role decorator* `*` is appended to the end of a name to mark that it denotes a [group role](09-roles.md#group-roles) (a role with multiple [slots](09-roles.md#slots)).

It must be present in the initial [declaration](#declarations) of a group role, and also any subsequent [references](#references) to the role.

The group-role decorator [MUST NOT](01-introduction.md#normative-language) be attached to the name of a variable.

## Example names

```viv
// Role binding a single entity
@person

// Role binding a group of entities
@people*

// Role binding a single symbol
&thing

// Role binding a group of symbols
&things*

// Scratch variable binding a (single) entity
$@person

// Scratch variable binding a (single) symbol
$&reason

// Local variable binding a (single) entity
_@temp_person

// Local variable binding a (single) symbol
_&temp_thing
```

## Declarations

When a [role](09-roles.md) is defined, its full name (including sigil and any decorator) must be declared:

```viv
action hang-out:
    roles:
        @person:
            as: initiator
        @friends*:
            as: recipient
            n: 2-5
```

Likewise when a variable is defined:

```viv
scratch:
    $@boss = @person.boss
effects:
    loop $@boss.friends as _@p:
        _@p.affinity[$@boss] -= #BIG
    end
```

## References

Once a role or variable has been defined, an author can refer to its bound value in an expression called a [reference](07-expressions.md#references). Again, its full name (including sigils and any decorator) must be used:

```viv
conditions:
    @person in @other.friends
```

A role or variable [MUST NOT](01-introduction.md#normative-language) be referred to prior to being declared.

## Plan-phase names

Though not a name in the sense of this chapter, a [plan phase](17-plans.md#phases) is introduced by prefixing an [identifier](02-lexical-elements.md#identifiers) with the *plan-phase sigil* `>`:

```viv
>setup:
    ...
>confrontation:
    ...
```

Plan phases cannot be referenced outside these declarations.

## Construct names

Construct names (for [actions](10-actions.md), [tropes](14-tropes.md), [plans](17-plans.md), etc.) are always declared as bare [identifiers](02-lexical-elements.md#identifiers), and thus also fall outside the purview of this chapter:

```viv
action foo:
    ...

trope bar:
    ...

plan baz:
    ...
```

Unlike roles and variables, constructs can only be referred to in ways that are disambiguated by context, e.g.:

```viv
action child from parent
queue action foo
queue plan bar
fit trope rivalry
search query betrayal
sift pattern rags-to-riches
```