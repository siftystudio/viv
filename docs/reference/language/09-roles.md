---
title: 9. Roles
---

<details>
<summary><i>EBNF</i></summary>

```ebnf
role           = role_reference ":" role_body .
role_reference = binding_type identifier [ group_role_decorator ] .
binding_type   = entity_sigil | symbol_sigil .
role_body      = (* unordered, each field optional *)
                 [ role_labels ]
                 [ role_slots ]
                 [ role_casting_pool_is | role_casting_pool_from ]
                 [ role_spawn_directive ]
                 [ role_renaming ] .
```
</details>

A *role definition*, or just *role*, specifies a slot in the cast of an [action](10-actions.md), [selector](18-selectors.md), [plan](17-plans.md), [query](15-queries.md), [sifting pattern](16-sifting-patterns.md), or [trope](14-tropes.md). At runtime, each role is *cast*—filled with an [entity or symbol](05-entities-and-symbols.md) drawn from a *casting pool*.

A role definition comprises a [role reference](#role-reference) followed by a colon and a [role body](#role-body). The body fields may appear in any order.

## Role reference

<details>
<summary><i>EBNF</i></summary>

```ebnf
role_reference = ( "@" | "&" ) identifier [ "*" ] .
```
</details>

The *role reference* names the role and declares whether it casts an [entity](05-entities-and-symbols.md) or a [symbol](05-entities-and-symbols.md). It has two parts: a [type sigil](06-names.md#type-sigils) (`@` for entities, `&` for symbols) and an [identifier](02-lexical-elements.md#identifiers). Optionally, the [group-role decorator](06-names.md#group-role-decorator) `*` may be appended.

```viv
@person:
    ...

&mood:
    ...

@allies*:
    ...
```

## Entity roles

An *entity role* is declared with the [entity sigil](06-names.md#type-sigils) `@` and casts an [entity](05-entities-and-symbols.md#entities)—a character, item, location, or action. Its [type label](#type-labels) determines which entity type it admits; if neither a type label nor a [participation-mode label](#participation-mode-labels) is given, the entity type defaults to `character`.

By default, the [action manager](20-runtime-model.md#action-targeting) assembles a casting pool from entities of the appropriate type that are present at the action's location. This default can be overridden with a [casting-pool directive](#casting-pool). Roles with entity type `action` [MUST](01-introduction.md#normative-language) have a casting-pool directive, since past actions are not situated in space and cannot be discovered by proximity.

```viv
@person:
    as: initiator

@heirloom:
    as: item

@past_transgression:
    as: action
    from: ~getTransgressions(@person)
```

## Symbol roles

A *symbol role* is declared with the [symbol sigil](06-names.md#type-sigils) `&` and casts a [symbol](05-entities-and-symbols.md#symbols)—an abstract value that does not correspond to an entity in the [host application](20-runtime-model.md#host-application). Symbol roles [MUST](01-introduction.md#normative-language) carry the `symbol` [type label](#type-labels). Because symbols are not part of the storyworld and cannot be discovered by proximity, a symbol role [MUST](01-introduction.md#normative-language) have a [casting-pool directive](#casting-pool), unless the role carries the `precast` [label](#labels).

```viv
&evidence:
    as: symbol
    from: ["fingerprints", "a strand of hair", "their wallet"]

&mood:
    as: symbol
    is: @person.mood
```

## Role body

The *role body* contains zero or more fields, each introduced by a keyword. The fields are: [labels](#labels) (`as`), [slots](#slots) (`n`), [casting pool](#casting-pool) (`is` or `from`), [spawn directive](#spawn-directive) (`spawn`), and [renaming](#renaming) (`renames`). All fields are optional, and they may appear in any order.

## Labels

<details>
<summary><i>EBNF</i></summary>

```ebnf
role_labels = "as" ":" role_label { "," role_label } .
role_label  = "character" | "item" | "action" | "location" | "symbol"
            | "initiator" | "partner" | "recipient" | "bystander"
            | "anywhere" | "precast" | "spawn" .
```
</details>

The *labels field* is introduced by the `as` keyword, and specifies one or more comma-separated *role labels* that determine the role's entity type and casting behavior. There are three kinds of labels: type labels, participation-mode labels, and modifier labels.

### Type labels

A *type label* declares the kind of entity or symbol the role casts:

| Label | Entity type |
|-------|-------------|
| `character` | Character |
| `item` | Item |
| `location` | Location |
| `action` | Action |
| `symbol` | Symbol |

### Participation-mode labels

For character roles in [actions](10-actions.md), a *participation-mode label* specifies how the character participates. These labels imply the `character` type:

| Label | Meaning |
|-------|---------|
| `initiator` | The single character who initiates the action. Each action [MUST](01-introduction.md#normative-language) have exactly one `initiator` role. |
| `partner` | A character who helps to initiate the action. |
| `recipient` | A character who receives or is affected by the action. |
| `bystander` | A character who witnesses the action without participating. |

### Modifier labels

*Modifier labels* alter casting behavior. See [combining labels](#combining-labels) for which combinations are valid.

| Label | Meaning |
|-------|---------|
| `anywhere` | The entity cast in this role does not need to be physically present at the action's location. Note that the entity *can* still be present; authors [SHOULD](01-introduction.md#normative-language) write [conditions](10-actions.md#conditions) to enforce absence if needed. |
| `precast` | The role must be precast (bound in advance) and is never cast through typical role casting. For actions, a role can be precast via a [reaction](11-reactions.md) that targets the action. If an action or [action selector](18-selectors.md) has a non-initiator precast role, it [MUST](01-introduction.md#normative-language) be marked [`reserved`](10-actions.md#reserved-marker). Note that the compiler automatically marks `initiator` roles as precast. |
| `spawn` | The entity cast in this role is to be constructed as a result of the action. Spawn roles are always accompanied by a [spawn directive](#spawn-directive). |

### Combining labels

Multiple labels may be combined in a single `as` field:

```viv
@ghost:
    as: character, anywhere

@target:
    as: recipient, precast

@newborn:
    as: character, spawn
```

Not all combinations are valid. The following sets of labels are mutually incompatible—only one label from each set may appear on a given role:

- **Type labels**: `character`, `item`, `location`, `action`, `symbol`. A role has exactly one entity type.
- **Participation-mode labels and `anywhere`**: `initiator`, `partner`, `recipient`, `bystander`, `anywhere`. Participation-mode labels describe characters who are physically present for the action; `anywhere` describes entities who are not. These are mutually exclusive because a character cannot simultaneously participate in a specific physical capacity and be unconstrained by location.
- **`spawn` and `symbol`**: Spawn roles produce new entities; symbol roles reference abstract values, not entities.
- **`spawn` and `action`**: Actions cannot be spawned.
- **`spawn` and `initiator`**: The initiator must already exist to initiate the action; it cannot be spawned by the action it initiates.

## Slots

<details>
<summary><i>EBNF</i></summary>

```ebnf
role_slots       = "n" ":" role_slots_range [ role_slots_mean | role_slots_optional_slot_casting_probability ] .
role_slots_range = integer [ "-" integer ] .
role_slots_mean  = "[" "~" number "]" .
role_slots_optional_slot_casting_probability = "[" number "%" "]" .
```
</details>

The *slots field* is introduced by the `n` keyword, and parameterizes the number of *role slots* to be filled when casting the role. It comprises a required [range](#slots-range) and an optional [mean](#slots-mean) or [optional-slot casting probability](#optional-slot-casting-probability).

If the slots field is omitted, both the minimum and maximum default to `1`.

### Slots range

The *range* specifies the minimum and maximum number of slots to fill. The notation affords three patterns:

* A single number specifies both the minimum and maximum: `n: 3`.
* Two numbers separated by a hyphen specify the minimum and maximum respectively: `n: 2-4`.
* If the slots field is omitted entirely, the minimum and maximum are both `1`.

The [action manager](20-runtime-model.md) will attempt to fill as many slots as possible, up to the maximum. If it cannot cast more than the minimum, targeting of the action will fail.

For a role whose maximum is greater than its minimum, the first `min` slots are *required slots*, while the rest are *optional slots*. If the minimum is `0`, the role is an *optional role*—one that does not need to be cast for action targeting to succeed. The maximum [MUST](01-introduction.md#normative-language) be greater than zero, and it MUST be equal to or greater than the minimum.

```viv
action foo:
    roles:
        @hero:
            as: initiator

        // min=2, max=2
        @sidekick:
            as: partner
            n: 2

        // min=0, max=3 (optional role)
        @witness*:
            as: bystander
            n: 0-3

        // Illegal: max MUST be positive
        @nobody:
            as: bystander
            n: 0

        // Illegal: max MUST be >= min
        @broken:
            as: bystander
            n: 3-2
```

### Slots mean

<details>
<summary><i>Implementation note</i></summary>

To derive a standard deviation `sd`, the reference compiler considers the span between `min` and `max`, i.e., `max - min`. If `span` is `0`, then `sd` is set to `0`. Otherwise `sd` is set to `max(log(span), span / 7)`, rounded to two decimals. The `log(span)` term keeps `sd` small when the span is small, while `span / 7` broadens the tails for spans around 20+, so that the distribution meaningfully covers the allowed range. This approach was arrived at empirically, and an implementation [MAY](01-introduction.md#normative-language) use another method instead.
</details>

Optionally, an author can specify the *mean* number of slots to attempt to fill when casting the role:

```viv
@crowd*:
    as: bystander
    n: 1-10 [~5]
```

This specifies the anchor for a normal distribution from which will be sampled the maximum number of slots to cast for the role. A compiler [MUST](01-introduction.md#normative-language) additionally derive a standard deviation, so that the normal distribution is fully specified.

The mean MUST fall between the minimum and maximum, inclusive. This parameter [MUST NOT](01-introduction.md#normative-language) be used in tandem with an [optional-slot casting probability](#optional-slot-casting-probability).

### Optional-slot casting probability

Optionally, an author can specify the probability that a qualifying candidate will be cast into an optional slot for the role:

```viv
@onlooker*:
    as: bystander
    n: 1-10 [35%]
```

This is only permitted for roles with optional slots—that is, where the maximum is greater than the minimum:

```viv
// Illegal: role must have optional slots
@fixed:
    as: bystander
    n: 3 [35%]
```

The probability [MUST](01-introduction.md#normative-language) fall between `0` and `100`, inclusive. This parameter [MUST NOT](01-introduction.md#normative-language) be used in tandem with a [mean](#slots-mean).

## Casting pool

<details>
<summary><i>EBNF</i></summary>

```ebnf
role_casting_pool_is   = "is" ":" expression .
role_casting_pool_from = "from" ":" expression .
```
</details>

The optional *casting-pool directive* specifies how to assemble a custom casting pool containing candidates for the role, in lieu of the default policy of considering nearby entities of the proper type.

### `from` directive

If `from` is used, the author [SHOULD](01-introduction.md#normative-language) supply an expression that at runtime will evaluate to a *collection* of candidates. These will constitute the casting pool for the role:

```viv
@friend:
    as: partner
    from: @hugger.friends
```

Because casting pools are [always shuffled](20-runtime-model.md#casting-pool-shuffling), expressions in this context produce conceptually unordered collections.

### `is` directive

An expression following the `is` keyword [SHOULD](01-introduction.md#normative-language) evaluate to a single candidate:

```viv
@beloved:
    as: partner
    is: @hugger.partner
```

### Fail-safe marker

The [fail-safe marker](07-expressions.md#fail-safe-marker) `?` may be used in casting-pool expressions. The runtime [MUST](01-introduction.md#normative-language) honor it by treating the pool as an empty (but legal) collection:

```viv
@friend:
    as: partner
    from: @hugger.friends?
```

### Circular dependencies

Circular dependencies between roles are prohibited, since they cannot be resolved:

```viv
// Illegal: mutual dependency
@friend1:
    as: partner
    from: @friend2.friends
@friend2:
    as: partner
    from: @friend1.friends
```

Such dependencies can always be resolved by removing one of the casting-pool directives and instead specifying the predicate as a [condition](10-actions.md#conditions):

```viv
@friend1:
    as: partner
@friend2:
    as: partner
    from: @friend1.friends
conditions:
    @friend1 in @friend2.friends
```

## Spawn directive

<details>
<summary><i>EBNF</i></summary>

```ebnf
role_spawn_directive = "spawn" ":" custom_function_call .
```
</details>

The *spawn directive* is introduced by the `spawn` keyword, and specifies an [custom function call](07-expressions.md#custom-function-calls) that will construct the new entity to be cast in this role. The role [MUST](01-introduction.md#normative-language) also carry the `spawn` [label](#labels):

```viv
@child:
    as: character, spawn
    spawn: ~createCharacter(@parent)
```

The adapter function is expected to create the entity in the host application and return its entity ID, which the runtime will then bind to the role.

## Renaming

<details>
<summary><i>EBNF</i></summary>

```ebnf
role_renaming = "renames" ":" role_reference .
```
</details>

The *renaming field* is introduced by the `renames` keyword, and specifies that this role is an alias for a role in a parent [action definition](10-actions.md). This is used in conjunction with [action inheritance](10-actions.md#inheritance) to give a child action's role a different name while inheriting the parent's role definition:

```viv
action insult:
    roles:
        @insulter:
            as: initiator
        @target:
            as: recipient

action mock from insult:
    roles:
        @mocker:
            renames: @insulter
```

## Role joining

The [roles field](10-actions.md#roles) is [joinable](10-actions.md#field-joinability). When a child action joins its roles with the parent's, the child's role definitions are merged with the parent's. New roles are added, and roles with matching names override the parent's definition for that role.

```viv
action parent:
    roles:
        @actor:
            as: initiator
        @target:
            as: recipient

action child from parent:
    join roles:
        @witness:
            as: bystander
```

## Singleton roles

A *singleton role* is a role with a [slots](#slots) maximum of one—the default. A [reference](07-expressions.md#references) to a singleton role evaluates to a single binding. The [group-role decorator](06-names.md#group-role-decorator) `*` [MUST NOT](01-introduction.md#normative-language) be used on singleton roles.

```viv
@hero:
    as: initiator

@sidekick:
    as: partner
```

## Group roles

A *group role* is a role with a [slots](#slots) maximum greater than one. Group roles are referenced with the [group-role decorator](06-names.md#group-role-decorator) `*` appended to the role name.  When unpacked—for instance, in a [template string](02-lexical-elements.md#template-strings)—the runtime iterates over all entities cast in that role:

```viv
action rally:
    gloss: "@leader rallies @followers*"
    roles:
        @leader:
            as: initiator
        @followers*:
            as: partner
            n: 2-5
```

The `*` decorator [MUST](01-introduction.md#normative-language) appear in the [declaration](06-names.md#declarations) of any role whose [slots](#slots) maximum exceeds one, and it [MUST](01-introduction.md#normative-language) also appear in every subsequent [reference](06-names.md#references) to that role. Conversely, using `*` on a [singleton role](#singleton-roles) is an error:

```viv
// Illegal: max > 1 but decorator is missing
@followers:
    as: partner
    n: 2-5

// Illegal: decorator on a singleton role
@hero*:
    as: initiator
```

When the group-role decorator is present, a [reference](07-expressions.md#references) to the role evaluates to a collection containing the candidates cast in the role. This stands in contrast to [singleton roles](09-roles.md#singleton-roles), which evaluate to a single binding. As such, dealing with the bindings of a group role generally requires iteration:

```viv
loop @friends* as _@friend:
    _@friend.mood += #SMALL
end
```

Note that [template strings](02-lexical-elements.md#template-strings) are an exception to this rule:

```viv
// @allies* will be expanded into a comma-separated list of entity labels
"@instigator rallies @allies* against @target."
```

## Role constraints

Depending on its [labels](#labels), a role may require or prohibit certain fields:

* A role with the `spawn` label [MUST](01-introduction.md#normative-language) have a [spawn directive](#spawn-directive).
* A role with the `precast` label [MUST NOT](01-introduction.md#normative-language) have a [casting-pool directive](#casting-pool), since precast roles receive their bindings externally.
* An action or [action selector](18-selectors.md) [MUST](01-introduction.md#normative-language) have exactly one role with the `initiator` label.
