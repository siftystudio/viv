---
title: 16. Sifting patterns
---

<details>
<summary><i>EBNF</i></summary>

```ebnf
sifting_pattern        = sifting_pattern_header ":" sifting_pattern_body .
sifting_pattern_header = "pattern" identifier .
sifting_pattern_body   = (* unordered; actions required, others optional *)
                         [ sifting_pattern_roles ]
                         sifting_pattern_actions
                         [ sifting_pattern_conditions ] .
```
</details>

A *sifting-pattern definition*, or just *sifting pattern*, describes a causally related sequence of actions that constitutes a storyline. Sifting patterns are the primary mechanism for *story sifting*—detecting emergent narratives in the chronicle of simulated events. They are named with an [identifier](02-lexical-elements.md#identifiers), and each sifting pattern in a [content bundle](19-compiler-output.md) must have a unique name.

Sifting patterns are invoked at runtime via [sifting expressions](07-expressions.md#sifting-expressions).

## Sifting-pattern header

<details>
<summary><i>EBNF</i></summary>

```ebnf
sifting_pattern_header = "pattern" identifier .
```
</details>

The *sifting-pattern header* is introduced by the `pattern` keyword, followed by the pattern's name:

```viv
pattern betrayal-arc:
    ...
```

## Roles

<details>
<summary><i>EBNF</i></summary>

```ebnf
sifting_pattern_roles = "roles" ":" role+ .
```
</details>

The optional *roles field* specifies one or more [role definitions](09-roles.md) that represent the recurring characters (or other entities) across the actions in the pattern:

```viv
pattern betrayal-arc:
    roles:
        @betrayer:
            as: character
        @victim:
            as: character
    ...
```

## Actions

<details>
<summary><i>EBNF</i></summary>

```ebnf
sifting_pattern_actions = "actions" ":" sifting_pattern_action+ .
sifting_pattern_action  = entity_sigil identifier [ group_role_decorator ] ":"
                          sifting_pattern_action_body .
sifting_pattern_action_body = [ role_slots ] ( role_casting_pool_is | role_casting_pool_from ) .
```
</details>

The *actions field* is introduced by the `actions` keyword, and specifies the action instances that make up the pattern. Each action entry names a variable (prefixed with `@`) and provides a casting-pool directive (`is` or `from`) that binds it to a specific action instance or a collection of candidate instances. Casting-pool expressions typically use [action searches](07-expressions.md#action-searches) to find candidates from the inherited [search domain](07-expressions.md#search-domains) or from a character's memories:

```viv
query acts-of-trust:
    tags:
        any: trust, friendship

query acts-of-betrayal:
    tags:
        any: betrayal, treachery

pattern betrayal-arc:
    roles:
        @betrayer:
            as: character
        @victim:
            as: character
    actions:
        @trust:
            from: search query acts-of-trust:
                over: inherit
        @betrayal:
            from: search query acts-of-betrayal:
                over: inherit
    conditions:
        @trust caused @betrayal
```

The action entries define the action variables that can be referenced in [conditions](#conditions) and tested with relational operators like `preceded`, `caused`, and `triggered` (see [Expressions](07-expressions.md)).

Unlike [roles](#roles), action entries are exempt from the entity uniqueness constraint—the same action instance may appear in multiple action roles. This is essential for [pattern composition](#pattern-composition), where two sub-patterns naturally share actions at their boundary.

### Group action roles

An action entry may use the [group-role decorator](06-names.md#group-role-decorator) `*` and a [slots](09-roles.md#slots) specification to match *multiple* action instances under a single role. This is useful when a storyline involves a variable number of actions filling the same narrative function—for example, several "setup" actions or many "scheme" actions:

```viv
pattern revenge:
    roles:
        @avenger:
            as: character
    actions:
        @setup*:
            from: search:
                over: inherit
            n: 1-50
        @climax:
            from: search query climactic-acts:
                over: inherit
    conditions:
        loop @setup* as _@s:
            _@s caused @climax
        end
```

A group action role [MUST](01-introduction.md#normative-language) use `from`, not `is`, and [MUST](01-introduction.md#normative-language) have a `max` of at least 2. As with [group roles](09-roles.md#group-roles) in other constructs, the `*` decorator must appear in the declaration and in every reference.

Action-relation operators (`preceded`, `caused`, `triggered`) require single-action operands. To test a relation involving a group action role, use a [loop](08-statements-and-control-flow.md#loops):

```viv
// Error: group action role as action-relation operand
@setup* preceded @climax

// Correct: iterate over the group
loop @setup* as _@s:
    _@s preceded @climax
end
```

The same computational considerations that apply to [group roles](09-roles.md#group-roles) in any construct apply here. Large slot ranges over large candidate pools increase casting time; authors [SHOULD](01-introduction.md#normative-language) use the narrowest casting pool and the smallest slot range that captures the intended pattern.

## Conditions

<details>
<summary><i>EBNF</i></summary>

```ebnf
sifting_pattern_conditions = "conditions" ":" statements .
```
</details>

The optional *conditions field* specifies a block of [statements](08-statements-and-control-flow.md) that must evaluate to truthy values for the pattern to match. Conditions typically reference the pattern's roles and action variables to establish causal and temporal relationships:

```viv
pattern betrayal-arc:
    roles:
        @betrayer:
            as: character
        @victim:
            as: character
    actions:
        @trust:
            from: search query acts-of-trust:
                over: inherit
        @betrayal:
            from: search query acts-of-betrayal:
                over: inherit
    conditions:
        @trust preceded @betrayal
        @trust caused @betrayal
```

## Pattern composition

Sifting patterns can be composed by using [sifting expressions](07-expressions.md#sifting-expressions) in action casting pools. A `sift pattern` expression in a `from` directive returns the matched actions as a flat collection of action instances, which the enclosing pattern can then bind to a [group action role](#group-action-roles).

To constrain how two sub-patterns relate to each other, introduce a shared role in the enclosing pattern and [precast](13-bindings.md) it into both sub-patterns. The shared role acts as a hinge—an action that must satisfy both patterns simultaneously:

```viv
pattern eye-for-an-eye:
    roles:
        @first-avenger:
            as: character
        @second-avenger:
            as: character
        @crux:
            as: action
            from: search:
                over: inherit
    actions:
        @first-revenge*:
            from: sift pattern revenge:
                over: inherit
                with partial:
                    @avenger: @first-avenger
                    @climax: @crux
            n: 1-999
        @second-revenge*:
            from: sift pattern revenge:
                over: inherit
                with partial:
                    @avenger: @second-avenger
                    @victim: @first-avenger
                    @offense: @crux
            n: 1-999
```

Here, `@crux` is precast as the `@climax` of the first revenge story and the `@offense` of the second. The sifting engine finds an action that serves as both—the act of revenge that itself provokes counter-revenge. This composition is type-safe: the compiler validates that every precast role name exists on the target pattern, so renaming a role in the sub-pattern produces a compile-time error rather than a silent failure.
