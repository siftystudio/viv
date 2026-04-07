---
title: 13. Bindings
---

<details>
<summary><i>EBNF</i></summary>

```ebnf
bindings          = bindings_none | bindings_partial | bindings_complete .
bindings_none     = "with" "none" ";" .
bindings_partial  = "with" "partial" ":" binding+ .
bindings_complete = "with" ":" binding+ .
binding           = role_reference ":" expression .
```
</details>

*Bindings* precast one or more roles of a targeted construct—that is, they supply role values in advance rather than relying on the runtime's casting process. Bindings appear in [reactions](11-reactions.md), [action searches](07-expressions.md#action-searches), and [sifting expressions](07-expressions.md#sifting-expressions).

There are three binding modes: [complete](#complete-bindings), [partial](#partial-bindings), and [none](#none-bindings).

## Complete bindings

*Complete bindings* are introduced by `with` followed by a colon and one or more [binding entries](#binding-entries). Complete bindings indicate that all roles of the targeted construct are being precast:

```viv
queue action confront:
    with:
        @confronter: @victim
        @confronted: @attacker
```

## Partial bindings

*Partial bindings* are introduced by `with partial` followed by a colon and one or more [binding entries](#binding-entries). Partial bindings indicate that only some roles are precast; the remaining roles will be cast normally by the runtime:

```viv
queue action retaliate:
    with partial:
        @avenger: @target
```

## None bindings

*None bindings* are specified as `with none;` and indicate that no roles are precast. All roles will be cast by the runtime:

```viv
queue action wander:
    with none;
```

This form is useful when the author wants to explicitly declare that no bindings are being passed, which may be required in some syntactic contexts.

## Binding entries

A *binding entry* maps a [role reference](09-roles.md#role-reference) to an [expression](07-expressions.md). The role reference names the role to precast, and the expression supplies the value:

```viv
@attacker: @insulter
@weapon: $@chosen_weapon
@location: ~getLocation()
```

## Sugared bindings

<details>
<summary><i>EBNF</i></summary>

```ebnf
bindings_sugared = bindings_sugared_none
                 | bindings_sugared_partial
                 | bindings_sugared_complete .
bindings_sugared_none     = "<" "none" ">" .
bindings_sugared_partial  = "<" "partial" bindings_sugared_actual_bindings ">" .
bindings_sugared_complete = "<" bindings_sugared_actual_bindings ">" .
bindings_sugared_actual_bindings = binding { "," binding }
                                | positional_binding { "," positional_binding } .
positional_binding = expression .
```
</details>

*Sugared bindings* are a compact inline syntax for bindings, enclosed in angle brackets. They appear in [trope fits](07-expressions.md#trope-fits). There are three forms, mirroring the standard binding modes:

```viv
// Complete sugared bindings
<@hero: @person, @villain: @enemy> fits trope rivalry

// Partial sugared bindings
<partial @hero: @person> fits trope rivalry

// None sugared bindings
<none> fits trope rivalry
```

### Positional bindings

Sugared bindings also support *positional bindings*, where expressions are matched to roles by position rather than by name:

```viv
<@person, @enemy> fits trope rivalry
```

In positional bindings, the expressions are bound to the targeted construct's roles in the order they are defined. Positional and named bindings [MUST NOT](01-introduction.md#normative-language) be mixed within a single sugared-bindings expression.
