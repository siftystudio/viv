---
title: 7. Expressions
---

<details>
<summary><i>EBNF</i></summary>

```ebnf
expression = assignment_expression
           | arithmetic_expression
           | logical_expression
           | inscription
           | inspection
           | unary_expression .
unary_expression = [ negation ] "(" expression ")"
                 | [ negation ] simple_unary_expression .
simple_unary_expression = object
                        | list
                        | custom_function_call
                        | reference
                        | chance_expression
                        | literal
                        | trope_fit
                        | trope_fit_sugared
                        | action_search
                        | sifting .
negation = "!" .
```
</details>

An *expression* is a syntactic form that evaluates to a [value](20-runtime-model.md#expression-values).

Expressions appear throughout Viv—in [conditions](10-actions.md#conditions), [effects](10-actions.md#effects), [casting-pool directives](09-roles.md#casting-pool), and many other contexts. This chapter describes each expression form.

## Operator precedence

The following table lists operators from lowest to highest precedence. Operators within the same row share the same precedence level. To override the default grouping for a complex expression, [parenthesize](#parenthesized-expressions) one or more of the component expressions.

| Precedence  | Operators                                                    | Associativity  |
| ----------- | ------------------------------------------------------------ | -------------- |
| 1 (lowest)  | `=`, `+=`, `-=`, `*=`, `/=`, `append`, `remove`              | None           |
| 2           | `inscribe`, `inspect`                                        | None           |
| 3           | `||`                                                         | Left           |
| 4           | `&&`                                                         | Left           |
| 5           | `==`, `!=`, `<`, `<=`, `>`, `>=`, `in`, `knows`, `caused`, `triggered`, `preceded` | None           |
| 6           | `+`, `-`                                                     | Left           |
| 7           | `*`, `/`                                                     | Left           |
| 8 (highest) | `!`                                                          | Unary (prefix) |

[Assignments](#assignments), [inscriptions](#inscriptions), and [inspections](#inspections) are tried before the precedence chain via ordered alternatives in the grammar. As such, they do not compose freely with other operators. For example, an expression like `@a.mood + 5 inscribe @b` yields a parse error.

As the table notes, relational operators are non-associative: `A < B < C` is a parse error. Use `A < B && B < C` instead.

Here are some examples showing how valid complex expressions are grouped according to operator precedence:

* `A + B * C` → `A + (B * C)`
* `A * B + C > D` → `((A * B) + C) > D`
* `A > B && C > D || E` → `((A > B) && (C > D)) || E`
* `A + B > C && !D || E == F` → `(((A + B) > C) && (!D)) || (E == F)`

## Parenthesized expressions

Any expression may be wrapped in parentheses to override the default [precedence grouping](#operator-precedence):

```viv
(@person.mood + @friend.mood) / 2
```

## Negation

The negation operator `!` inverts the truthiness of an expression:

```viv
!@person.dead
!(@person.best_friend == @target)
```

:::caution
Only a single `!` may be applied. For instance, `!!@person.dead` yields a parse error. (`!(!@person.dead)` does not, however.)
:::

## Literals

The literal forms are valid expressions whose syntaxes are specified in their respective sections: [booleans](02-lexical-elements.md#booleans), [null](02-lexical-elements.md#null), [numbers](02-lexical-elements.md#numbers), [strings](02-lexical-elements.md#strings), [template strings](02-lexical-elements.md#template-strings), [enums](02-lexical-elements.md#enums), [lists](02-lexical-elements.md#lists), and [objects](02-lexical-elements.md#objects).

## References

<details>
<summary><i>EBNF</i></summary>

```ebnf
reference = [ scratch_variable_sigil | local_variable_sigil ]
            ( entity_sigil | symbol_sigil ) identifier [ group_role_decorator ]
            [ eval_fail_safe_marker ] [ reference_path ] .
```

</details>

A *reference* is the primary way to read data from the [simulated storyworld](05-entities-and-symbols.md#simulated-storyworld).

It's anchored in the [name](06-names.md) of a role or variable, and may include an optional [reference path](#reference-paths).

### Bare references

A bare reference to an [entity](05-entities-and-symbols.md#entities)—meaning a bare entity [name](06-names.md) with no [reference path](#reference-paths)—always evaluates to its [entity ID](05-entities-and-symbols.md#entities), which is ultimately a string. (Note that as soon as any reference path is attached to such a reference, the entity ID is automatically dereferenced—i.e., you can write `@person.friends` in lieu of `@person->friends`.) This is called [dehydration](20-runtime-model.md#dehydration).

Meanwhile, a bare reference to a [symbol](05-entities-and-symbols.md#symbols) evaluates to the bound symbol value itself.

### Reference paths

<details>
<summary><i>EBNF</i></summary>

```ebnf
reference_path   = ( property_access | pointer_access | lookup_access )+ .
```
</details>
A *reference path* extends a reference with a sequence of one or more chained access operations, potentially reaching into data associated with other entities. There are three kinds of path segments:

#### Property access (`.`)

<details>
<summary><i>EBNF</i></summary>

```ebnf
property_access  = "." property_name [ eval_fail_safe_marker ] .
property_name    = ( letter | digit | "_" )+ .
eval_fail_safe_marker = "?" .
```
</details>

A *property access* uses dot notation to evaluate the specified property of the evaluation of a given reference.

Note that, unless the [fail-safe marker](#fail-safe-marker) is used, the specified property [MUST](01-introduction.md#normative-language) exist.

Here's a few examples:

* `@person.name`
  * Evaluates to the value stored in the `name` property of the entity cast as `@person`.
* `@person.personality.shy`
  * Evaluates to the value stored in the `shy` field of the `personality` property on the entity cast as `@person`.
* `_@wand.power`
  * Evaluates to the value stored in the `power` property of the entity saved to the local variable `_@wand`.

#### Lookup access (`[]`)

<details>
<summary><i>EBNF</i></summary>

```ebnf
lookup_access    = "[" expression "]" [ eval_fail_safe_marker ] .
eval_fail_safe_marker = "?" .
```
</details>

A *lookup access* uses bracket notation to access by key (or index) a value in the evaluation of a given reference, where the key is an arbitrary [expression](07-expressions.md).

Here are some important constraints (which can be suppressed via the [fail-safe marker](#fail-safe-marker)):

* If the property being accessed is an array, the key expression [MUST](01-introduction.md#normative-language) evaluate to a non-negative integer and MUST fall in bounds (given the array length).
* If the property being accessed is an object, the key expression [MUST](01-introduction.md#normative-language) evaluate to a string and MUST be defined in the object.

And here are some examples:

* `@person.friends[0]`
  * Evaluates to the 0th element stored in the `friends` array property of the entity cast as `@person`.
* `@person.affinities[@other]`
  * Evaluates to the value stored a) in the `affinities` object property of the entity cast as `@person`, b) under the key corresponding to the evaluation of `@other`. As noted above, a [bare reference](#bare-references) like `@other` evaluates to an [entity ID](05-entities-and-symbols.md#entities), which is ultimately a string (and thus a valid key).

#### Pointer access (`->`)

<details>
<summary><i>EBNF</i></summary>

```ebnf
pointer_access   = "->" property_name [ eval_fail_safe_marker ] .
property_name    = ( letter | digit | "_" )+ .
eval_fail_safe_marker = "?" .
```
</details>

A *pointer access* uses arrow notation of the form `<reference>-><property_name>` to access a property on another entity.

The reference preceding the arrow evaluates to an [entity ID](05-entities-and-symbols.md#entities), which is dereferenced, and then the specified property on *that* entity is accessed.

Here are some important constraints (which can be suppressed via the [fail-safe marker](#fail-safe-marker), except where noted):

* A pointer access [MUST NOT](01-introduction.md#normative-language) be the first segment in a reference path. While a syntax like `@person->boss` might seem required—because `@person` evaluates to an entity ID—Viv enables authors to directly access the properties of the anchor entity, as in `@person.boss`. To reduce confusion, Viv enforces that this pattern be used exclusively. Under the hood, this is supported by the interpreter hydrating the anchor entity ID prior to walking a reference path. This constraint cannot be suppressed by the fail-safe marker.
* The reference preceding the arrow [MUST](01-introduction.md#normative-language) evaluate to an entity ID.
* The specified property MUST exist on the dereferenced entity.

Finally, some examples:

* `@person.boss->boss`
  * Evaluates to the person's boss's boss—that is, the value stored in the `boss` property of the entity whose ID is stored in the `boss` property of the entity cast in the `@person` role.
* `@item.location->address`
  * Evaluates to the address of the location of the item: the value stored in the `address` property of the entity whose ID is stored in the `location` property of the entity cast in the `@item` role.

#### Chaining

Path segments may be chained in any combination, with the components of the reference path being evaluated left to right, with each segment operating on the result of the previous one.

Here's some examples of complex reference paths:

```viv
@person.friends[0]->name
@person.kids[0]->best_friend->father->name.middle
@person.spouse->spouse->spouse->spouse
```

### Fail-safe marker

The *fail-safe marker* `?` instructs the [interpreter](20-runtime-model.md#interpreter) to treat a missing or null value as a soft failure rather than an error.

It may appear after a reference or after any segment of a [reference path](#reference-paths), including the final segment. If the value at the marked position is null or undefined, evaluation of the reference short-circuits and yields `null` instead of raising an error:

```viv
// If @person has a null 'partner' property, yields null instead of an error
@person.partner?->name

// Fail-safe on the reference itself
@person?.name

// Multiple fail-safe markers in a chain
@person?.partner?->friends?[0]?
```

The fail-safe marker also applies in [casting-pool directives](09-roles.md#casting-pool), where a null result causes the pool to be treated as empty rather than producing an error.

## Assignments

<details>
<summary><i>EBNF</i></summary>

```ebnf
assignment          = reference assignment_operator expression .
assignment_operator = "=" | "+=" | "-=" | "*=" | "/=" | "append" | "remove" .
```
</details>

An *assignment expression* modifies a value in the host application via the [adapter](20-runtime-model.md). The left-hand side [MUST](01-introduction.md#normative-language) be a [reference](06-names.md#references). The available operators are:

| Operator | Meaning |
|----------|---------|
| `=` | Set the value. |
| `+=` | Add to the value. |
| `-=` | Subtract from the value. |
| `*=` | Multiply the value. |
| `/=` | Divide the value. |
| `append` | Append to a list value. |
| `remove` | Remove from a list value. |

```viv
@person.mood = 50
@person.mood += 10
@person.friends append @new_friend
@person.enemies remove @former_enemy
```

Assignment expressions always evaluate to `true`.

## Arithmetic expressions

<details>
<summary><i>EBNF</i></summary>

```ebnf
arithmetic_expression = unary_expression arithmetic_operator expression .
arithmetic_operator   = "+" | "-" | "*" | "/" .
```
</details>

An *arithmetic expression* applies a binary arithmetic operator to two operands:

```viv
@person.strength + 10
@person.gold * 2
(@buyer.budget + @seller.asking) / 2
```

## Logical expressions

<details>
<summary><i>EBNF</i></summary>

```ebnf
logical_expression     = disjunction .
disjunction            = conjunction { "||" conjunction } .
conjunction            = relational_expression { "&&" relational_expression } .
relational_expression  = unary_expression relational_operator unary_expression
                       | unary_expression .
```
</details>

*Logical expressions* combine relational tests using the conjunction operator `&&` (logical AND) and the disjunction operator `||` (logical OR). Standard short-circuit evaluation applies.

```viv
@person.mood > 50 && @person.boldness > 30
@person.hungry || @person.tired
```

## Relational operators

<details>
<summary><i>EBNF</i></summary>

```ebnf
relational_operator = "==" | "!=" | "<" | "<=" | ">" | ">="
                    | "in" | "knows" | "caused" | "triggered" | "preceded" .
```
</details>

A *relational expression* compares two operands using one of the following operators:

### Standard comparison

| Operator | Meaning |
|----------|---------|
| `==` | Equal to |
| `!=` | Not equal to |
| `<` | Less than |
| `<=` | Less than or equal to |
| `>` | Greater than |
| `>=` | Greater than or equal to |

### Special comparison

The additional relational operators each merit a bit more detail.

#### `in`

The `in` operator tests whether the left operand is contained in the right operand (typically a list or collection):

```viv
@person in @group.members
```

#### `knows`

The `knows` operator tests whether a character (left operand) has a memory of a given action (right operand). It returns `true` if the character's memories include the action, and `false` otherwise:

```viv
@person knows @betrayal_action
```

#### `caused`

The `caused` operator tests whether an action (left operand) is a causal ancestor of another action (right operand)—that is, whether the left action directly or transitively led to the right action:

```viv
@insult caused @retaliation
```

#### `triggered`

The `triggered` operator tests whether an action (left operand) is a direct cause of another action (right operand)—that is, whether the right action's immediate causes include the left action:

```viv
@insult triggered @retaliation
```

:::note
The distinction between `caused` and `triggered` is one of directness: `caused` tests transitive ancestry, while `triggered` tests immediate parentage.
:::

#### `preceded`

The `preceded` operator tests whether an action (left operand) occurred before another action (right operand). If both actions have the same timestamp, the left is deemed to have preceded the right if and only if the right is not a causal ancestor of the left:

```viv
@first_meeting preceded @betrayal
```

### Action-relation operand constraints

The `caused`, `triggered`, and `preceded` operators [MUST](01-introduction.md#normative-language) receive single-action operands. A [group action role](16-sifting-patterns.md#group-action-roles) reference (e.g., `@setup*`) is not permitted as an operand. To test a relation for each member of a group, use a [loop](08-statements-and-control-flow.md#loops):

```viv
loop @setup* as _@s:
    _@s preceded @climax
end
```

## Chance expressions

<details>
<summary><i>EBNF</i></summary>

```ebnf
chance_expression = number "%" .
```
</details>

A *chance expression* evaluates to `true` with the specified probability (expressed as a percentage) and `false` otherwise:

```viv
50%    // true half the time
10%    // true 10% of the time
```

Chance expressions are useful in [conditions](10-actions.md#conditions) and [effects](10-actions.md#effects) to introduce randomness.

## Custom function calls

<details>
<summary><i>EBNF</i></summary>

```ebnf
custom_function_call = "~" identifier "(" [ expression { "," expression } ] ")" [ "?" ] .
```
</details>

A *custom function call* invokes a function exposed by the host application in its [adapter](20-runtime-model.md). The call is prefixed with the `~` operator, followed by the function name, parenthesized arguments, and an optional [fail-safe marker](#fail-safe-marker):

```viv
~getRandomInsult()
~calculateDamage(@attacker.strength, @defender.armor)
~findNearbyCharacters(@location)?
```

Arguments are evaluated and dehydrated (entity data is converted to entity IDs) before being passed to the adapter function. If the `?` marker is present and the function returns `null` or `undefined`, evaluation short-circuits gracefully rather than raising an error.

## Trope fits

<details>
<summary><i>EBNF</i></summary>

```ebnf
trope_fit         = "fit" "trope" identifier ":" bindings .
trope_fit_sugared = bindings_sugared "fits" "trope" identifier .
```
</details>

A *trope fit* expression tests whether a [trope](14-tropes.md) matches for a given set of [bindings](13-bindings.md). It evaluates to a boolean:

```viv
// Standard form
fit trope rivalry:
    with:
        @hero: @person1
        @villain: @person2

// Sugared form
<@person1, @person2> fits trope rivalry
```

## Action searches

<details>
<summary><i>EBNF</i></summary>

```ebnf
action_search = action_search_header ":" action_search_body
              | action_search_bare_header ":" action_search_bare_body .
action_search_header      = "search" "query" identifier .
action_search_bare_header = "search" .
action_search_body = (* unordered, each field optional *)
                     [ search_domain ]
                     [ bindings ] .
action_search_bare_body = search_domain .
```
</details>

An *action search* expression executes a [query](15-queries.md) over a [search domain](#search-domains) and returns the list of matching action instances. There are two forms:

### Named query search

A named query search references a defined [query](15-queries.md) by name, with optional [bindings](13-bindings.md) and a [search domain](#search-domains):

```viv
search query recent-betrayals:
    over: chronicle
    with:
        @perpetrator: @villain
```

### Bare search

A bare search specifies only a [search domain](#search-domains), without referencing a query:

```viv
search:
    over: @person
```

## Search domains

<details>
<summary><i>EBNF</i></summary>

```ebnf
search_domain = "over" ":" ( "inherit" | "chronicle" | expression ) .
```
</details>

A *search domain* specifies the collection of action instances to search over. There are three forms:

| Domain | Meaning |
|--------|---------|
| `inherit` | The search domain inherited from an enclosing context (e.g., a sifting pattern that is itself searching over a domain). |
| `chronicle` | The global chronicle—the complete record of all actions performed in the simulation. |
| *expression* | An expression that evaluates to a collection of action instances, or a character reference whose memories will be searched. |

```viv
search query recent-acts:
    over: chronicle

search query personal-history:
    over: @person

search query subset:
    over: inherit
```

## Sifting expressions

<details>
<summary><i>EBNF</i></summary>

```ebnf
sifting        = sifting_header sifting_body .
sifting_header = "sift" "pattern" identifier ":" .
sifting_body   = (* unordered, each field optional *)
                 [ search_domain ]
                 [ bindings ] .
```
</details>

A *sifting expression* invokes a [sifting pattern](16-sifting-patterns.md) over a [search domain](#search-domains), with optional [bindings](13-bindings.md). It returns the list of matches—each match being a set of role and action bindings that satisfy the pattern:

```viv
sift pattern betrayal-arc:
    over: chronicle
    with partial:
        @betrayer: @villain
```

## Inscriptions

<details>
<summary><i>EBNF</i></summary>

```ebnf
inscription = unary_expression "inscribe" expression .
```
</details>

An *inscription* expression records knowledge of an action onto an item. The left operand [MUST](01-introduction.md#normative-language) evaluate to an item, and the right operand MUST evaluate to an action. After evaluation, the item carries a record of the action, which can later be revealed to a character via [inspection](#inspections):

```viv
@letter inscribe @secret_meeting
```

Inscription always evaluates to `true`.

## Inspections

<details>
<summary><i>EBNF</i></summary>

```ebnf
inspection = unary_expression "inspect" expression .
```
</details>

An *inspection* expression causes a character to learn about all actions inscribed on an item. The left operand [MUST](01-introduction.md#normative-language) evaluate to a character, and the right operand MUST evaluate to an item. After evaluation, the character gains memories of all actions previously [inscribed](#inscriptions) on the item:

```viv
@reader inspect @letter
```

Inspection always evaluates to `true`.
