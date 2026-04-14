---
title: 17. Plans
---

<details>
<summary><i>EBNF</i></summary>

```ebnf
plan        = plan_header ":" plan_body .
plan_header = "plan" identifier .
plan_body   = (* unordered; roles and phases required, conditions optional *)
              plan_roles
              [ plan_conditions ]
              plan_phases .
```
</details>

A *plan definition*, or just *plan*, specifies a multi-phase sequence of coordinated [reactions](11-reactions.md) that unfolds over time. Plans are named with an [identifier](02-lexical-elements.md#identifiers), and each plan in a [content bundle](19-compiler-output.md) must have a unique name.

## Plan header

<details>
<summary><i>EBNF</i></summary>

```ebnf
plan_header = "plan" identifier .
```
</details>

The *plan header* is introduced by the `plan` keyword, followed by the plan's name:

```viv
plan revenge-arc:
    ...
```

## Roles

<details>
<summary><i>EBNF</i></summary>

```ebnf
plan_roles = "roles" ":" role+ .
```
</details>

The *roles field* specifies one or more [role definitions](09-roles.md) that parameterize the plan. This field is required.

```viv
plan revenge-arc:
    roles:
        @avenger:
            as: character
        @target:
            as: character
    ...
```

## Conditions

<details>
<summary><i>EBNF</i></summary>

```ebnf
plan_conditions = "conditions" ":" statements .
```
</details>

The optional *conditions field* specifies a block of [statements](08-statements-and-control-flow.md) that must evaluate to truthy values for the plan to proceed.

## Phases

<details>
<summary><i>EBNF</i></summary>

```ebnf
plan_phases = "phases" ":" plan_phase+ .
plan_phase  = plan_phase_name ":" plan_instructions .
plan_phase_name = ">" identifier .
```
</details>

The *phases field* is introduced by the `phases` keyword, and specifies an ordered sequence of *plan phases*. Each phase has a name prefixed with the [plan-phase sigil](06-names.md#plan-phase-names) `>`, followed by a colon and a block of [plan instructions](#plan-instructions).

A plan begins execution at its first phase. When a phase's instruction tape is exhausted, the plan implicitly advances to the next phase—or, for the final phase, implicitly succeeds. The `advance`, `succeed`, and `fail` instructions may be used to exit a phase early, such as from within a conditional.

```viv
plan revenge-arc:
    roles:
        @avenger:
            as: character
        @target:
            as: character
    phases:
        >gather-info:
            queue action investigate:
                with:
                    @investigator: @avenger
        >confront:
            queue action confront:
                with:
                    @confronter: @avenger
                    @confronted: @target
```

## Plan instructions

<details>
<summary><i>EBNF</i></summary>

```ebnf
plan_instruction = plan_conditional
                 | plan_loop
                 | plan_instruction_reaction
                 | plan_instruction_reaction_window
                 | plan_instruction_wait
                 | plan_instruction_advance
                 | plan_instruction_succeed
                 | plan_instruction_fail .
```
</details>

*Plan instructions* are the building blocks of [plan phases](#phases). They are evaluated in order as an instruction tape. The available instructions are:

### Reactions

A [reaction declaration](11-reactions.md) may appear directly as a plan instruction. A bare reaction—one not enclosed within a [reaction window](#reaction-windows)—is fire-and-forget: the plan queues the construct but does not wait for its completion. If the plan needs to block until a reaction completes, use a reaction window.

```viv
>preparation:
    queue action study-architecture:
        with partial:
            @student: @schemer
    queue action begin-apprenticeship-with-builder:
        with partial:
            @apprentice: @schemer
    queue action survey-victim-estate:
        with partial:
            @surveyor: @schemer
```

All three reactions are queued during the `>preparation` phase, but the plan does not wait for any of them to complete before advancing to the next phase.

### Reaction windows

<details>
<summary><i>EBNF</i></summary>

```ebnf
plan_instruction_reaction_window = ( "all" | "any" | "untracked" ) ":" plan_instruction+ "close" .
```
</details>

A *reaction window* groups multiple plan instructions and specifies how the plan should wait for their completion. There are three window operators:

| Operator | Behavior |
|----------|----------|
| `all` | The plan waits for all instructions in the window to complete before advancing. If no reactions are queued during the window, the plan advances immediately. |
| `any` | The plan advances as soon as any one instruction in the window completes. If all queued constructs fail, the plan fails. If no reactions are queued during the window, the plan fails. |
| `untracked` | The instructions are issued but the plan does not wait for their completion. |

Phases are the primary sequencing mechanism for plans: if step A must complete before step B begins, they belong in separate phases. Within a single phase, bare reactions are concurrent—they are all issued as part of that phase's work. Reaction windows provide finer-grained synchronization within a phase, for cases where some reactions must complete before the tape proceeds to subsequent instructions.

```viv {2,9}
>infiltration:
    all:
        queue action forge-documents:
            with partial:
                @forger: @schemer
        queue action establish-cover-identity:
            with partial:
                @agent: @schemer
    close
    queue action enter-compound:
        with:
            @infiltrator: @schemer
```

Here, the `all:` window ensures that both `forge-documents` and `establish-cover-identity` complete before `enter-compound` is queued. Without the window, all three would be queued immediately as bare reactions.

```viv {2,9}
>preparation:
    all:
        queue action gather-supplies:
            with partial:
                @gatherer: @hero
        queue action scout-area:
            with partial:
                @scout: @hero
    close
```

### Wait

<details>
<summary><i>EBNF</i></summary>

```ebnf
plan_instruction_wait = "wait" ":" plan_instruction_wait_timeout plan_instruction_wait_until?
                      | "wait" ":" plan_instruction_wait_until? plan_instruction_wait_timeout .
plan_instruction_wait_timeout = "timeout" ":" time_period .
plan_instruction_wait_until   = "until" ":" statements .
```
</details>

A *wait instruction* pauses plan execution for a specified duration, optionally with an early-exit condition. It has two subfields, which may appear in either order:

* **`timeout`:** A [time period](12-temporal-constraints.md#time-periods) specifying the maximum wait duration. This field is required.

* **`until`:** An optional block of [statements](08-statements-and-control-flow.md). If all evaluate to truthy values, the wait ends early.

```viv
>cooldown:
    wait:
        timeout: 2 days
        until:
            @avenger.anger > 90
```

### advance

The `advance` instruction immediately moves the plan to its next phase, skipping any remaining instructions in the current phase. If the plan is in its final phase, `advance` is equivalent to `succeed`. This instruction is typically used inside a conditional to exit a phase early; phases implicitly advance when their instruction tape is exhausted.

### succeed

The `succeed` instruction immediately terminates the plan successfully, skipping any remaining instructions. This instruction is typically used inside a conditional to end a plan early; the final phase of a plan implicitly succeeds when its instruction tape is exhausted.

### fail

The `fail` instruction immediately terminates the plan as a failure. Unlike `advance` and `succeed`, there is no implicit failure—plans only fail via an explicit `fail` instruction or when a reaction window cannot be satisfied.

### Conditionals and loops

Plan instructions support [conditionals](08-statements-and-control-flow.md#conditionals) and [loops](08-statements-and-control-flow.md#loops), allowing plan logic to branch or iterate:

```viv
>response:
    if @avenger.strength > 80:
        queue action fight:
            with partial:
                @fighter: @avenger
    else:
        queue action flee:
            with partial:
                @runner: @avenger
    end
```
