---
title: 12. Temporal constraints
---

<details>
<summary><i>EBNF</i></summary>

```ebnf
temporal_constraint = time_frame_statement | time_of_day_statement .
```
</details>

A *temporal constraint* restricts when a [reaction](11-reactions.md) may execute or when a [query](15-queries.md) match is valid. There are two kinds: [time-frame constraints](#time-frame-constraints), which specify windows relative to an anchor event, and [time-of-day constraints](#time-of-day-constraints), which specify clock-time boundaries.

Multiple temporal constraints may appear in a single `time` field. When they do, all constraints must be satisfied simultaneously.

## Time-frame constraints

<details>
<summary><i>EBNF</i></summary>

```ebnf
time_frame_statement = time_frame_statement_before
                     | time_frame_statement_after
                     | time_frame_statement_between .
time_frame_statement_before  = "before" ":" time_period time_frame_anchor .
time_frame_statement_after   = "after" ":" time_period time_frame_anchor .
time_frame_statement_between = "between" ":" time_period "and" time_period time_frame_anchor .
```
</details>

A *time-frame constraint* specifies a window of time relative to a [time-frame anchor](#time-frame-anchors). There are three forms:

### `before`

The constraint is satisfied at any point before the specified duration has elapsed from the anchor:

```viv
before: 1 hour from action
```

### `after`

The constraint is satisfied at any point after the specified duration has elapsed from the anchor:

```viv
after: 2 days from hearing
```

### `between`

The constraint is satisfied between two durations from the anchor:

```viv
between: 1 hour and 3 hours from action
```

## Time periods

<details>
<summary><i>EBNF</i></summary>

```ebnf
time_period = number time_unit .
time_unit   = "minute" | "minutes" | "hour" | "hours"
            | "day" | "days" | "week" | "weeks"
            | "month" | "months" | "year" | "years" .
```
</details>

A *time period* is a duration comprising a [number](02-lexical-elements.md#numbers) and a unit. The available time units are `minute`/`minutes`, `hour`/`hours`, `day`/`days`, `week`/`weeks`, `month`/`months`, and `year`/`years`.

Singular and plural forms are interchangeable—the grammar accepts both, regardless of the numeric value:

```viv
1 hour
3 hours
1 day
12 minutes
```

## Time-frame anchors

<details>
<summary><i>EBNF</i></summary>

```ebnf
time_frame_anchor = "from" "action"
                  | "from" "hearing"
                  | "from" "now"
                  | "ago" .
```
</details>

A *time-frame anchor* specifies the reference point from which a time-frame constraint is measured. There are four anchors:

| Anchor | Meaning |
|--------|---------|
| `from action` | The time at which the triggering action was performed. |
| `from hearing` | The time at which the character learned about the triggering action. This may differ from `action` if the character was not present and heard about it later. |
| `from now` | The current simulation time at the point of evaluation. |
| `ago` | Equivalent to `from now`, but placed after the time period for readability (e.g., `3 days ago`). |

```viv
// These are equivalent
after: 3 days from now
after: 3 days ago
```

## Time-of-day constraints

<details>
<summary><i>EBNF</i></summary>

```ebnf
time_of_day_statement = time_of_day_statement_before
                      | time_of_day_statement_after
                      | time_of_day_statement_between .
time_of_day_statement_before  = "before" ":" time_of_day .
time_of_day_statement_after   = "after" ":" time_of_day .
time_of_day_statement_between = "between" ":" time_of_day "and" time_of_day .
time_of_day = hours [ ":" minutes ] [ "pm" | "am" ] .
```
</details>

A *time-of-day constraint* restricts execution to a clock-time window within a simulated day. Like time-frame constraints, there are `before`, `after`, and `between` forms, but these operate on absolute times of day rather than durations from an anchor.

### Time-of-day format

A *time of day* is specified as hours, optionally followed by a colon and minutes, and optionally followed by `am` or `pm`:

```viv
8am
8:30am
14:00
6pm
12:30
```

If neither `am` nor `pm` is specified, the time is interpreted as 24-hour format.

### Examples

```viv
// Only before 8 AM
time:
    before: 8am

// Only during business hours
time:
    after: 9am
    before: 5pm

// Only during the evening
time:
    between: 6pm and 11pm
```
