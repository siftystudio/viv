---
title: 15. Queries
---

<details>
<summary><i>EBNF</i></summary>

```ebnf
query        = query_header ":" query_body .
query_header = "query" identifier .
query_body   = (* unordered, each field optional *)
               [ query_roles ] [ query_conditions ]
               [ query_action_name ] [ query_ancestors ] [ query_descendants ]
               [ query_importance ] [ query_tags ] [ query_salience ]
               [ query_associations ] [ query_location ] [ query_time ]
               [ query_initiator ] [ query_partners ] [ query_recipients ]
               [ query_bystanders ] [ query_active ] [ query_present ] .
```
</details>

A *query definition*, or just *query*, specifies a pattern for searching over recorded action instances—either in a character's memories or in the global chronicle. Queries are named with an [identifier](02-lexical-elements.md#identifiers), and each query in a [content bundle](19-compiler-output.md) must have a unique name.

Queries are invoked at runtime via [action search](07-expressions.md#action-searches) expressions.

## Query header

<details>
<summary><i>EBNF</i></summary>

```ebnf
query_header = "query" identifier .
```
</details>

The *query header* is introduced by the `query` keyword, followed by the query's name:

```viv
query recent-betrayals:
    ...
```

## Roles

<details>
<summary><i>EBNF</i></summary>

```ebnf
query_roles = "roles" ":" role+ .
```
</details>

The optional *roles field* specifies one or more [role definitions](09-roles.md) that parameterize the query. A query may have zero roles, in which case the field is omitted:

```viv
query acts-against:
    roles:
        @perpetrator:
            as: character
        @victim:
            as: character
    ...
```

## Conditions

<details>
<summary><i>EBNF</i></summary>

```ebnf
query_conditions = "conditions" ":" statements .
```
</details>

The optional *conditions field* specifies a block of [statements](08-statements-and-control-flow.md) that must evaluate to truthy values for a match:

```viv
query acts-against:
    conditions:
        @perpetrator.opinion[@victim] < -30
    ...
```

## Action name

<details>
<summary><i>EBNF</i></summary>

```ebnf
query_action_name = "action" ":" set_predicate_tags+ .
```
</details>

The *action-name field* constrains matches by the name of the recorded action, using one or more [set predicates over tags](#set-predicates-over-tags):

```viv
query violent-acts:
    action:
        any: attack, murder, assault
    ...
```

## Ancestors

<details>
<summary><i>EBNF</i></summary>

```ebnf
query_ancestors = "ancestors" ":" set_predicate+ .
```
</details>

The *ancestors field* constrains matches by their causal ancestors—the prior action instances that caused them, directly or transitively—using one or more [set predicates](#set-predicates):

```viv
query revenge-acts:
    ancestors:
        any: @original_offense
    ...
```

## Descendants

<details>
<summary><i>EBNF</i></summary>

```ebnf
query_descendants = "descendants" ":" set_predicate+ .
```
</details>

The *descendants field* constrains matches by their causal descendants—the subsequent action instances they caused, directly or transitively—using one or more [set predicates](#set-predicates).

## Importance

<details>
<summary><i>EBNF</i></summary>

```ebnf
query_importance = "importance" ":" query_numeric_criteria .
query_numeric_criteria  = query_numeric_criterion+ .
query_numeric_criterion = query_numeric_criterion_operator ":" ( enum | number ) .
query_numeric_criterion_operator = "==" | "<=" | ">=" | "<" | ">" .
```
</details>

The *importance field* constrains matches by their [importance](10-actions.md#importance) value using one or more [numeric criteria](#numeric-criteria):

```viv
query major-events:
    importance:
        >=: #HIGH
    ...
```

## Tags

<details>
<summary><i>EBNF</i></summary>

```ebnf
query_tags = "tags" ":" set_predicate_tags+ .
```
</details>

The *tags field* constrains matches by their [tags](10-actions.md#tags), using one or more [set predicates over tags](#set-predicates-over-tags):

```viv
query social-acts:
    tags:
        any: social, romantic
    ...
```

## Salience

<details>
<summary><i>EBNF</i></summary>

```ebnf
query_salience = "salience" ":" query_numeric_criteria .
```
</details>

The *salience field* constrains matches by their [salience](10-actions.md#saliences) value as held by the searching character, using one or more [numeric criteria](#numeric-criteria). This field is only valid when searching over a character's memories; if the query is executed with the chronicle as the search domain, an error will be thrown.

## Associations

<details>
<summary><i>EBNF</i></summary>

```ebnf
query_associations = "associations" ":" set_predicate_tags+ .
```
</details>

The *associations field* constrains matches by their [associations](10-actions.md#associations) as held by the searching character, using one or more [set predicates over tags](#set-predicates-over-tags). Like [salience](#salience), this field is only valid when searching over character memories.

## Location

<details>
<summary><i>EBNF</i></summary>

```ebnf
query_location = "location" ":" set_predicate+ .
```
</details>

The *location field* constrains matches by the location at which the action was performed, using one or more [set predicates](#set-predicates).

## Time

<details>
<summary><i>EBNF</i></summary>

```ebnf
query_time = "time" ":" temporal_constraint+ .
```
</details>

The *time field* constrains matches by the time at which the action was performed, using one or more [temporal constraints](12-temporal-constraints.md). A query may have at most one time-frame constraint and at most one time-of-day constraint.

## Role-based filters

A query may constrain matches by the entities that were cast in particular roles. Each role-based filter uses one or more [set predicates](#set-predicates).

<details>
<summary><i>EBNF</i></summary>

```ebnf
query_initiator  = "initiator" ":" set_predicate+ .
query_partners   = "partners" ":" set_predicate+ .
query_recipients = "recipients" ":" set_predicate+ .
query_bystanders = "bystanders" ":" set_predicate+ .
query_active     = "active" ":" set_predicate+ .
query_present    = "present" ":" set_predicate+ .
```
</details>

| Field | Constrains by |
|-------|---------------|
| `initiator` | The entity that initiated the action |
| `partners` | The entities that partnered in the action |
| `recipients` | The entities that received the action |
| `bystanders` | The entities that witnessed the action |
| `active` | The entities that were actively involved (initiator, partners, recipients) |
| `present` | All entities that were present (active participants and bystanders) |

```viv
query acts-by-person:
    roles:
        @person:
            as: character
    initiator:
        any: @person
    time:
        after: 1 week ago
```

## Set predicates

<details>
<summary><i>EBNF</i></summary>

```ebnf
set_predicate          = set_predicate_operator ":" expression { "," expression } .
set_predicate_operator = "none" | "any" | "all" | "exactly" .
```
</details>

A *set predicate* tests a relationship between a set of actual values and a set of specified values. There are four operators:

| Operator | Meaning |
|----------|---------|
| `none` | None of the specified values appear in the actual set. |
| `any` | At least one of the specified values appears in the actual set. |
| `all` | All of the specified values appear in the actual set. |
| `exactly` | The actual set contains exactly the specified values, and no others. |

Each operator is followed by a colon and one or more comma-separated [expressions](07-expressions.md):

```viv
location:
    any: @tavern, @marketplace
    none: @dungeon
```

When multiple set predicates appear in a single field, all must be satisfied.

For singular-value fields (`location` and `initiator`), the `all` operator is not permitted—use `exactly` instead. Additionally, if `exactly` is used in a field, it [MUST](01-introduction.md#normative-language) be the only set predicate in that field.

## Set predicates over tags

<details>
<summary><i>EBNF</i></summary>

```ebnf
set_predicate_tags          = set_predicate_operator ":" tag { "," tag } .
```
</details>

Some fields ([action name](#action-name), [tags](#tags), [associations](#associations)) use a variant of set predicates that operates over [tag identifiers](02-lexical-elements.md#identifiers) rather than general expressions:

```viv
tags:
    all: social, public
    none: violent
```

## Numeric criteria

<details>
<summary><i>EBNF</i></summary>

```ebnf
query_numeric_criteria  = query_numeric_criterion+ .
query_numeric_criterion = query_numeric_criterion_operator ":" ( enum | number ) .
query_numeric_criterion_operator = "==" | "<=" | ">=" | "<" | ">" .
```
</details>

A *numeric criterion* tests a numeric value against a threshold. The operator is one of `==`, `<=`, `>=`, `<`, `>`, and the value is a [number](02-lexical-elements.md#numbers) or [enum](02-lexical-elements.md#enums):

```viv
importance:
    >=: 5
    <: 10
```

When multiple numeric criteria appear in a single field, all must be satisfied.
