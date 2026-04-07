---
title: 11. Reactions
---

<details>
<summary><i>EBNF</i></summary>

```ebnf
reaction        = reaction_header ":" reaction_body .
reaction_header = "queue" reaction_target .
reaction_target = reaction_target_type identifier .
reaction_target_type = "action" | "action-selector" | "plan" | "plan-selector" .
```
</details>

A *reaction declaration*, or just *reaction*, specifies a construct that may be queued for future execution in response to an [action](10-actions.md) being performed. Reactions appear in the [reactions field](10-actions.md#reactions) of an action definition or as [plan instructions](17-plans.md#plan-instructions).

## Reaction header

<details>
<summary><i>EBNF</i></summary>

```ebnf
reaction_header      = "queue" reaction_target .
reaction_target      = reaction_target_type identifier .
reaction_target_type = "action" | "action-selector" | "plan" | "plan-selector" .
```
</details>

The *reaction header* is introduced by the `queue` keyword, followed by a *reaction target*. The target comprises a target type and an [identifier](02-lexical-elements.md#identifiers) naming the construct to queue.

The four *reaction-target types* are:

| Keyword | Targets |
|---------|---------|
| `action` | An [action definition](10-actions.md) |
| `action-selector` | An [action selector](18-selectors.md) |
| `plan` | A [plan definition](17-plans.md) |
| `plan-selector` | A [plan selector](18-selectors.md) |

```viv
queue action retaliate:
    ...

queue action-selector choose-response:
    ...

queue plan revenge-arc:
    ...
```

## Reaction body

<details>
<summary><i>EBNF</i></summary>

```ebnf
reaction_body = (* unordered; bindings required, others optional *)
                bindings
                [ reaction_urgency ]
                [ reaction_priority ]
                [ reaction_location ]
                [ reaction_time ]
                [ reaction_abandonment_conditions ]
                [ reaction_repeat_logic ] .
```
</details>

The *reaction body* contains zero or more fields, each introduced by a keyword. The fields are: [bindings](#bindings) (`with`), [urgency](#urgency) (`urgent`), [priority](#priority) (`priority`), [location](#location) (`location`), [time](#time) (`time`), [abandonment conditions](#abandonment-conditions) (`abandon`), and [repeat logic](#repeat-logic) (`repeat`). All fields except [bindings](#bindings) are optional, and they may appear in any order.

## Bindings

The *bindings* for a reaction precast one or more roles of the targeted construct. Bindings are required; use `with none;` to explicitly declare that no roles are precast. For full details on bindings syntax, see the [Bindings](13-bindings.md) chapter.

```viv
queue action retaliate:
    with:
        @attacker: @insulter
        @defender: @target
```

## Urgency

<details>
<summary><i>EBNF</i></summary>

```ebnf
reaction_urgency = "urgent" ":" expression .
```
</details>

The *urgency field* is introduced by the `urgent` keyword, and specifies an [expression](07-expressions.md) that determines whether this reaction should be processed urgently—that is, before the next simulation tick rather than in the normal queue order. The expression [SHOULD](01-introduction.md#normative-language) evaluate to a boolean value:

```viv
queue action flee:
    with none;
    urgent: @victim.fear > 80
```

## Priority

<details>
<summary><i>EBNF</i></summary>

```ebnf
reaction_priority = "priority" ":" expression .
```
</details>

The *priority field* is introduced by the `priority` keyword, and specifies an [expression](07-expressions.md) that yields a numeric value used to order this reaction relative to others in the queue. Higher values indicate higher priority:

```viv
queue action retaliate:
    with none;
    priority: @target.aggression
```

## Location

<details>
<summary><i>EBNF</i></summary>

```ebnf
reaction_location = "location" ":" set_predicate+ .
```
</details>

The *location field* is introduced by the `location` keyword, and constrains where the reaction may be executed using one or more [set predicates](15-queries.md#set-predicates). The reaction will only proceed if the location conditions are met at the time of execution:

```viv
queue action confront:
    with none;
    location:
        any: @scene_of_crime
```

For full details on set predicates (`none`, `any`, `all`, `exactly`), see the [Queries](15-queries.md) chapter.

## Time

<details>
<summary><i>EBNF</i></summary>

```ebnf
reaction_time = "time" ":" temporal_constraint+ .
```
</details>

The *time field* is introduced by the `time` keyword, and constrains when the reaction may be executed using one or more [temporal constraints](12-temporal-constraints.md). The reaction will only proceed within the specified time frame:

```viv
queue action retaliate:
    with none;
    time:
        after: 1 hour from action
        before: 1 week from action
```

For full details on temporal constraints, see the [Temporal constraints](12-temporal-constraints.md) chapter.

## Abandonment conditions

<details>
<summary><i>EBNF</i></summary>

```ebnf
reaction_abandonment_conditions = "abandon" ":" statements .
```
</details>

The *abandonment-conditions field* is introduced by the `abandon` keyword, and specifies a block of [statements](08-statements-and-control-flow.md) that, if all evaluate to truthy values, cause the queued reaction to be abandoned (removed from the queue) rather than executed:

```viv
queue action retaliate:
    with none;
    abandon:
        @target.mood > 80
        @insulter.dead
```

## Repeat logic

<details>
<summary><i>EBNF</i></summary>

```ebnf
reaction_repeat_logic     = "repeat" ":" reaction_repeat_logic_if reaction_repeat_logic_max
                          | "repeat" ":" reaction_repeat_logic_max reaction_repeat_logic_if .
reaction_repeat_logic_if  = "if" ":" statements .
reaction_repeat_logic_max = "max" ":" integer .
```
</details>

The *repeat-logic field* is introduced by the `repeat` keyword, and specifies conditions under which a reaction will be re-queued after execution. It has two subfields, which may appear in either order:

* **`if`:** A block of [statements](08-statements-and-control-flow.md). If all evaluate to truthy values after the reaction executes, the reaction is re-queued.

* **`max`:** An integer specifying the maximum number of times the reaction may be repeated.

```viv
queue action pester:
    with none;
    repeat:
        if:
            @target.patience > 0
        max: 5
```
