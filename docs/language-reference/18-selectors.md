---
title: 18. Selectors
---

<details>
<summary><i>EBNF</i></summary>

```ebnf
selector        = selector_header ":" selector_body .
selector_header = [ reserved_construct_marker ] selector_type identifier .
selector_type   = "action-selector" | "plan-selector" .
```
</details>

A *selector definition*, or just *selector*, specifies a set of candidate constructs and a policy for choosing among them. There are two kinds: *action selectors* choose among [actions](10-actions.md), and *plan selectors* choose among [plans](17-plans.md). Selectors are named with an [identifier](02-lexical-elements.md#identifiers), and each selector in a [content bundle](19-compiler-output.md) must have a unique name.

## Selector header

<details>
<summary><i>EBNF</i></summary>

```ebnf
selector_header = [ "reserved" ] selector_type identifier .
selector_type   = "action-selector" | "plan-selector" .
```
</details>

The *selector header* introduces a selector definition. It declares the selector type and its name. Action selectors may optionally include a [reserved marker](10-actions.md#reserved-marker):

```viv
action-selector choose-greeting:
    ...

plan-selector choose-revenge-plan:
    ...

reserved action-selector special-response:
    ...
```

When an action selector is marked `reserved`, it may only be targeted via a [reaction](11-reactions.md) or through another selector, just like a [reserved action](10-actions.md#reserved-marker). Plan selectors cannot be marked `reserved`, since plans are always targeted via reactions.

## Selector body

<details>
<summary><i>EBNF</i></summary>

```ebnf
selector_body = (* unordered; target group required, others optional *)
                [ selector_roles ]
                [ selector_conditions ]
                selector_target_group .
selector_roles      = "roles" ":" role+ .
selector_conditions = "conditions" ":" statements .
```
</details>

The *selector body* contains a required [target group](#target-group) and two optional fields: [roles](#roles) and [conditions](#conditions).

## Roles

<details>
<summary><i>EBNF</i></summary>

```ebnf
selector_roles = "roles" ":" role+ .
```
</details>

The optional *roles field* specifies one or more [role definitions](09-roles.md) that parameterize the selector:

```viv
action-selector choose-social:
    roles:
        @person:
            as: initiator
        @bystander:
            as: bystander
    ...
```

For action selectors, an `initiator` role is always required—but it does not always need to be declared explicitly. See [initiator pass-through](#initiator-pass-through) below.

### Initiator pass-through

Like [actions](10-actions.md), an action selector requires an `initiator` role. The most common use of an action selector is to select an action for a given initiator during general [action targeting](20-runtime-model.md#action-targeting)—for instance, choosing between `greet`, `wave`, and `nod` for whoever the initiator happens to be. In this common case, the selector itself has no roles beyond the initiator, and each candidate receives the same initiator.

To support this, an action selector [MAY](01-introduction.md#normative-language) omit the `roles` field entirely. When it does, the compiler creates a virtual initiator role and automatically passes the initiator from the targeting context through to each candidate:

```viv
// The initiator is passed through to whichever candidate is selected
action-selector choose-greeting:
    target randomly:
        greet;
        wave;
        nod;
```

If a selector needs additional roles beyond the initiator—for example, a bystander that parameterizes the choice of action—the `roles` field [MUST](01-introduction.md#normative-language) be present, and it [MUST](01-introduction.md#normative-language) include an explicit `initiator` role alongside the additional roles:

```viv
action-selector choose-social:
    roles:
        @person:
            as: initiator
        @bystander:
            as: bystander
    target randomly:
        greet;
        wave;
```

Omitting the `roles` field signals that the initiator is the only role and should be passed through implicitly; including it signals that all roles—including the initiator—are explicitly declared.

This mechanism applies only to action selectors. Plans do not have initiators, and consequently neither do plan selectors.

### Plan selectors and roles

[Plans](17-plans.md) do not have initiators, so there is no initiator pass-through for plan selectors. A plan selector [MAY](01-introduction.md#normative-language) still omit the `roles` field—but the meaning is different: a role-less plan selector is pure dispatch, and the selected plan's roles are cast entirely from the world state at execution time. When a plan selector does define roles, those roles can be used to parameterize the selection or to pre-bind candidate plan roles via [bindings](13-bindings.md):

```viv
// Pure dispatch: plan roles are cast at execution time
plan-selector choose-plan:
    target randomly:
        revenge-plan;
        forgiveness-plan;

// Parameterized: the selector pre-binds a role in each candidate plan
plan-selector choose-plan-for:
    roles:
        @hero:
            as: character
    target randomly:
        revenge-plan:
            with partial:
                @avenger: @hero
        forgiveness-plan:
            with partial:
                @forgiver: @hero
```

## Conditions

<details>
<summary><i>EBNF</i></summary>

```ebnf
selector_conditions = "conditions" ":" statements .
```
</details>

The optional *conditions field* specifies a block of [statements](08-statements-and-control-flow.md) that must evaluate to truthy values for the selector to proceed.

## Target group

<details>
<summary><i>EBNF</i></summary>

```ebnf
selector_target_group = "target" selector_policy ":" selector_candidates .
selector_policy       = "randomly" | "with" "weights" | "in" "order" .
selector_candidates   = selector_candidate+ .
selector_candidate    = [ selector_candidate_weight ] selector_candidate_name ";"
                      | [ selector_candidate_weight ] selector_candidate_name ":" bindings .
selector_candidate_name   = [ "selector" ] identifier .
selector_candidate_weight = "(" expression ")" .
```
</details>

The *target group* specifies the set of candidate constructs and the policy for choosing among them. It is introduced by the `target` keyword, followed by a [target policy](#target-policies) and a colon, and then one or more [candidate entries](#candidates).

### Target policies

The *target policy* determines how a candidate is selected from the group:

| Policy | Behavior |
|--------|----------|
| `randomly` | A candidate is chosen uniformly at random. |
| `with weights` | A candidate is chosen with probability proportional to its [weight](#weighting). |
| `in order` | Candidates are tried in the order listed; the first one whose targeting succeeds is selected. |

```viv
action-selector random-greeting:
    target randomly:
        greet;
        wave;
        nod;
```

### Candidates

A *candidate entry* names a construct to consider. By default, the candidate names an action (for action selectors) or a plan (for plan selectors). If prefixed with the `selector` keyword, the candidate names another selector, enabling chaining:

```viv
action-selector master-selector:
    target in order:
        selector urgent-responses;
        selector social-actions;
        idle;
```

A candidate entry terminates with `;` if it has no [bindings](13-bindings.md), or with `:` followed by a bindings block if it does:

```viv
action-selector choose-response:
    roles:
        @person:
            as: initiator
    target randomly:
        // No bindings
        wave;
        // With bindings
        greet:
            with partial:
                @greeter: @person
```

For action selectors, each candidate [MUST](01-introduction.md#normative-language) precast the selector's `initiator` role in the candidate's corresponding `initiator` role. This ensures the initiator is consistent across the selector and all of its candidates.

### Weighting

When the `with weights` policy is used, each candidate [MAY](01-introduction.md#normative-language) have a *weight expression* enclosed in parentheses before the candidate name. The expression [SHOULD](01-introduction.md#normative-language) evaluate to a numeric value:

```viv
action-selector weighted-social:
    roles:
        @person:
            as: initiator
    target with weights:
        (80) greet;
        (15) wave;
        (5) ignore;
```

If a weight expression evaluates to zero or a negative number, the candidate is excluded from selection.
