---
title: 8. Statements and control flow
---

<details>
<summary><i>EBNF</i></summary>

```ebnf
statements       = statement+ .
statement        = conditional | loop | reaction | expression .
scoped_statements = ( (* not "end", "else:", or "elif:" *) statement )+ .
```
</details>

A *statement* is either a [conditional](#conditionals), a [loop](#loops), a [reaction](11-reactions.md), or an [expression](07-expressions.md). Statements appear in the bodies of [action fields](10-actions.md) such as [conditions](10-actions.md#conditions), [scratch](10-actions.md#scratch), and [effects](10-actions.md#effects), as well as in other constructs that accept statement blocks.

## Conditionals

<details>
<summary><i>EBNF</i></summary>

```ebnf
conditional = conditional_branches [ "else:" alternative ] "end" .
conditional_branches = "if" conditional_branch { "elif" conditional_branch } .
conditional_branch   = condition ":" consequent .
condition            = expression .
consequent           = scoped_statements .
alternative          = scoped_statements .
```
</details>

A *conditional* is an `if`/`elif`/`else`/`end` construct that executes one of several statement blocks depending on which condition evaluates to a truthy value. The `elif` and `else` branches are optional.

```viv
if @person.mood > 50:
    @person.status = "happy"
elif @person.mood > 25:
    @person.status = "neutral"
else:
    @person.status = "sad"
end
```

Conditions are evaluated in order. The first branch whose condition is truthy has its consequent executed; all remaining branches are skipped. If no condition is truthy and an `else` branch is present, its alternative is executed. If no condition is truthy and there is no `else` branch, execution continues past the `end`.

A conditional [MUST](01-introduction.md#normative-language) be terminated by `end`:

```viv del={1-3}
// Illegal: missing 'end'
if @person.mood > 50:
    @person.status = "happy"
```

```viv ins={1-4}
// Legal
if @person.mood > 50:
    @person.status = "happy"
end
```

Conditionals may be nested:

```viv
if @person.mood > 50:
    if @person.boldness > 50:
        @person.status = "confident"
    end
end
```

## Loops

<details>
<summary><i>EBNF</i></summary>

```ebnf
loop           = "loop" unary_expression "as" local_variable ":" scoped_statements "end" .
local_variable = local_variable_sigil binding_type identifier .
```
</details>

A *loop* iterates over a collection, binding each element to a [local variable](#local-variables) in turn. The body is a block of statements terminated by `end`.

```viv
loop @person.friends as _@friend:
    _@friend.trust += 5
end
```

The collection expression [MUST](01-introduction.md#normative-language) evaluate to an iterable value. The local variable is scoped to the loop body and is not accessible outside of it.

Loops may be nested:

```viv
loop @person.friends as _@friend:
    loop _@friend.items as _@item:
        _@item.value += 1
    end
end
```

## Local variables

<details>
<summary><i>EBNF</i></summary>

```ebnf
local_variable = local_variable_sigil binding_type identifier .
```
</details>

A *local variable* is a variable scoped to a single block, such as a [loop](#loops) body. Local variables are prefixed with the [local sigil](06-names.md#scope-sigils) `_`, followed by a [type sigil](06-names.md#type-sigils) (`@` or `&`) and an [identifier](02-lexical-elements.md#identifiers):

```viv
_@friend
_&value
```

Local variables are introduced by `loop` statements using the `as` keyword. They are only accessible within the body of the construct that introduces them.
