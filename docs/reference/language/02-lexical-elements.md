---
title: 2. Lexical elements
---

This chapter provides a technical overview of lexical structure in the Viv DSL, with a focus on how a source file is converted into a sequence of tokens. 

## Source encoding

A Viv source file is treated as UTF-8 text.

## Comments

<details>
<summary><i>EBNF</i></summary>

```ebnf
comment = "//" { any character except newline } (newline | EOF)
```
</details>

A *comment* is introduced with `//` and continues to the end of the line (or to the end of the file). As such, all of these are valid comments:

```viv
// A comment can take up its own line
    // Indentation doesn't matter
action greet:  // Trailing comments work too
    ...
// Final line can be a comment without a trailing newline
```

Comments cannot be placed inside [strings](#strings) and [template strings](#template-strings), however:

```viv
"// this is not a comment"
```

Comments are ignored, in the sense that they act like whitespace.

Block comments are not supported.

## Whitespace

Whitespace between [tokens](#tokens), including tabs and newlines, is ignored. This includes spaces (`U+0020`), horizontal tabs (`U+0009`), carriage returns (`U+000D`), and newlines (`U+000A`). In this respect, authors are free to format their Viv code according to taste.

Note that whitespace characters appearing inside [strings](#strings) and [template strings](#template-strings) are part of those tokens themselves, and thus are not skipped.

## Tokens

A Viv source file is divided into *tokens*, the smallest units of meaning recognized by the grammar. Tokens are separated by [whitespace](#whitespace) and [comments](#comments), which are otherwise ignored (as explained above).

There are seven classes of tokens—[identifiers](#identifiers), [sigils](#sigils), [operators](#operators), [punctuation](#punctuation), [keywords](#keywords), [constants](#constants), and [literals](#literals)—each of which is described below.

## Identifiers

<details>
<summary><i>EBNF</i></summary>

```ebnf
identifier       = (* must not match reserved_keyword or reserved_internal_keyword *)
                   letter { letter | digit | "_" } { "-" ( letter | digit | "_" ) { letter | digit | "_" } } .
letter           = "A" … "Z" | "a" … "z" | "_" .
digit            = "0" … "9" .
reserved_keyword          = "elif" | "else" | "end" | "if" | "include" | "loop" .
reserved_internal_keyword = "__" identifier .
```
</details>

An *identifier* names an author-defined item, such as a [construct](03-file-structure.md), [role](06-names.md), or [variable](06-names.md).

Identifiers are case-sensitive and alphanumeric, with hyphens and underscores being permitted. They [MUST](01-introduction.md#normative-language) begin with a letter or underscore, and a hyphen [MUST](01-introduction.md#normative-language) be followed by at least one letter, digit, or underscore. For example, `crush`, `_friend2`, and `plot-revenge` are all valid identifiers, while `2friend`, `-revenge`, and `bad-` are not.

An identifier MUST NOT be one of the following *reserved words*, which are required for syntactic disambiguation:

```
elif    else    end    if    include    loop
```

Note that reserved words are also case-sensitive (e.g., `Include` is not reserved).

Additionally, an identifier MUST NOT be prefixed with `__`, which marks a set of reserved fields that are used internally by the Viv runtime.

## Sigils

The Viv *sigils* are single-character tokens that prefix [names](06-names.md) to indicate their type or scope. Additionally, there is a related single-character suffix that we call a *decorator*.

These markers are described at length in a [dedicated chapter](06-names.md), but the following table provides a summary:

| Symbol | Name | Purpose |
|-------|------|---------|
| `@` | Entity sigil | Marks the [entity](05-entities-and-symbols.md#entities) type. |
| `&` | Symbol sigil | Marks the [symbol](05-entities-and-symbols.md#symbols) type. |
| `$` | Scratch-scope sigil | Marks the [scratch](10-actions.md#scratch) variable scope. |
| `_` | Local-scope sigil | Marks the [local](08-statements-and-control-flow.md#local-variables) variable scope. |
| `>` | Plan-phase sigil | Marks a [plan phase](17-plans.md#phases). |
| `*` | Group-role decorator | Marks a [group role](09-roles.md#group-roles). |

## Operators

The following *operators*, each detailed elsewhere, are treated as tokens:

| Category              | Operators |
|-----------------------|-----------|
| Arithmetic            | `+`, `-`, `*`, `/` |
| Relational            | `==`, `!=`, `<`, `<=`, `>`, `>=`, `in`, `knows`, `caused`, `triggered`, `preceded` |
| Assignment            | `=`, `+=`, `-=`, `*=`, `/=`, `append`, `remove` |
| Logical               | `!`, `&&`, `\|\|` |
| Reference             | `.`, `->`, `[`, `]`, `?` |
| Custom function call  | `~` |
| Probabilistic casting | `%`, `~` |
| Inscription           | `inscribe`, `inspect` |

Note that certain symbols correspond to multiple operators, either because they function as distinct operators in different contexts (e.g., `*`, `~`) or because they happen to occur in multi-symbol operators (e.g., `-` vis-à-vis `-=` and `->`).

## Punctuation

The following punctuation tokens structure the syntax: `:`, `;`, `,`, `(`, `)`, `{`, `}`, `[`, `]`, `<`, `>`.

Note that the square brackets here are distinct from the [reference operators](07-expressions.md#reference-paths) `[` and `]`, because they appear in different contexts with distinct functions. Likewise, the angle brackets `<` and `>` serve as punctuation in [sugared bindings](13-bindings.md#sugared-bindings), distinct from the [relational operators](07-expressions.md#relational-operators) of the same form.

## Keywords

As a DSL, Viv features a variety of special *keywords* to help authors specify concerns that are pertinent in the domain. These keywords can be broken into several categories, which are given below. Certain keywords appear in multiple categories, because they serve different purposes in different contexts (e.g., `from`).

Note that only a subset of these keywords are reserved words prohibited for [identifiers](#identifiers), as explained above.

### Unit headers

These keywords structure the headers that introduce the top-level constructs that make up a [source file](03-file-structure.md):

```
action    action-selector    from       include         pattern
plan      plan-selector      query      reserved        template
trope     with
```

### Action fields

Additional keywords mark and structure the fields within an [action definition](10-actions.md):

```
associations   conditions   default    effects      embargoes   for
gloss          importance   join       reactions    report      roles
saliences      scratch      tags
```

### Role fields

These keywords structure the fields within a [role definition](09-roles.md):

```
as    from    is    n    renames    spawn
```

### Role labels

The [role labels](09-roles.md#labels) are keywords:

```
action      anywhere    bystander    character    initiator
item        location    partner      precast      recipient
spawn       symbol
```

### Reaction fields

The fields of a [reaction](11-reactions.md) are keywords:

```
abandon    location    priority    queue    repeat
time       urgent      with
```

### Temporal constraints

A number of keywords allow authors to place [temporal constraints](12-temporal-constraints.md) on constructs like [reactions](11-reactions.md) and [queries](15-queries.md):

```
after      and        before     between    from

one        two        three      four       five
six        seven      eight      nine       ten
eleven     twelve

minute     minutes    hour       hours      day        days
week       weeks      month      months     year       years

am         pm
```

### Embargo fields

The fields of an [embargo](10-actions.md#embargoes) are keywords:

```
location    roles    time
```

### Set predicates

Keywords are used in [set predicates](15-queries.md#set-predicates):

```
all    any    exactly    none
```

### Query fields

Keywords are used in [query definitions](15-queries.md):

```
action         active         ancestors      associations    bystanders
conditions     descendants    importance     initiator       location
partners       present        recipients     roles           salience
tags           time
```

### Plan instructions

Keywords are used in [plan instructions](17-plans.md#plan-instructions):

```
all         any         close       end
timeout     untracked   until      wait
```

### Selector fields

Keywords are used in [selector definitions](18-selectors.md):

```
conditions    randomly    roles
selector      target
```

The following two-word keyword sequences also appear in selectors:

```
in order      with weights
```

### Bindings

Keywords are used in [precast bindings](13-bindings.md):

```
none    partial    with
```

### Flow and control

Keywords are used to specify [local variables](08-statements-and-control-flow.md#local-variables), [conditionals](08-statements-and-control-flow.md#conditionals), and [loops](08-statements-and-control-flow.md#loops):

```
as    else    elif    end    if    loop
```

### Domain-specific expressions

Keywords support domain-specific expressions:

```
fit     fits    over    search    sift        
```

## Constants

In Viv, a *constant* is a fixed, named value that denotes a predefined option for a given field.

### Temporal constants

Constants used to anchor [temporal constraints](12-temporal-constraints.md):

```
action    ago    hearing    now
```

### Embargo constants

Constants used to parameterize [embargoes](10-actions.md#embargoes) :

```
anywhere    forever    here
```

### Plan constants

Constants used as [plan instructions](17-plans.md#plan-instructions):

```
advance    fail    succeed
```

### Search constants

Constants used to parameterize [search domains](07-expressions.md#search-domains):

```
chronicle    inherit
```

## Literals

<details>
<summary><i>EBNF</i></summary>

```ebnf
literal = enum | string | number | boolean | null .
```
</details>

What follows are the *literal forms* that Viv supports.

### Booleans

The *boolean literals* are `true` and `false`.

### Null

The *null literal* is `null`.

### Numbers

<details>
<summary><i>EBNF</i></summary>

```ebnf
number  = [ sign ] digits [ "." digits ] .
sign    = "+" | "-" .
digits  = digit { digit } .
digit   = "0" … "9" .
```
</details>

In terms of *number literals*, Viv supports both decimal integers (`0`, `77`, `-31`, `+88`) and decimal fractions (`3.14`, `-0.5`, `+99.9`). 

Numbers [MUST](01-introduction.md#normative-language) have at least one digit before the decimal point in fractions—e.g., `0.5` is valid, while `.5` is not. A single leading `+` or `-` is allowed.

Only base-10 literals are supported; there are no hexadecimal, octal, or binary forms. Exponent notation and digit separators are not supported.

### Strings

<details>
<summary><i>EBNF</i></summary>

```ebnf
string_literal = '"' { any character except '"' or newline } '"'
               | "'" { any character except "'" or newline } "'" .
```
</details>

Viv *string literals* may be single-quoted (`'Hello!'`) or double-quoted (`"Goodbye..."`). A string ends at the matching quote, and escaping is not supported.

### Template strings

<details>
<summary><i>EBNF</i></summary>

```ebnf
template_string = '"' ( template_gap | template_char )+ '"'
                | "'" ( template_gap | template_char )+ "'" .
template_gap    = "{" expression "}" | reference .
template_char   = (* any character except '"', '{', '}', and sigil characters *) .
```
</details>

Viv *template strings* interpolate [expressions](07-expressions.md) that are enclosed in curly brackets:

```viv
"{@bully.name} insults {@target.name} by calling them a {~getRandomInsult()}."
```

Template strings can also interpolate [references](06-names.md#references) without use of brackets:

```viv
"@bully insults @targets* at @this.location->address."
```

Note that the preceding example is just syntactic sugar for this:

```viv
"{@bully} insults {@targets*} at {@this.location->address}."
```

A string is parsed as a template string (rather than a plain string literal) when it contains a *template gap*: an expression contained in curly braces, or else a bare reference beginning with a [sigil](#sigils). For more information on how template strings will be rendered by a runtime, see the section on [rendering template strings](20-runtime-model.md#rendering-template-strings).

### Lists

<details>
<summary><i>EBNF</i></summary>

```ebnf
list = "[" [ expression { "," expression } ] "]" .
```
</details>

A Viv *list literal* sequences zero or more ordered [expressions](07-expressions.md), the evaluations of which do not have to match in type.

Examples:

```viv
[]
[&thing]
[77, "lol", @foo, ~getSomething()]
```

### Objects

<details>
<summary><i>EBNF</i></summary>

```ebnf
object         = "{" [ key_value_pair { "," key_value_pair } ] "}" .
key_value_pair = key ":" expression .
key            = string | bare_key .
bare_key       = letter { letter | digit | "_" | "-" } .
```
</details>

Viv *object literals* are key–value pairs in a JavaScript-like notation, where keys may either be enclosed in quotes or bare. A value is any [expression](07-expressions.md).

Examples:

```viv
{}
{"foo": 77}
{ a: ~getSomething(), "b": @foo.name, zzz: "sleep" }
```

### Enums

<details>
<summary><i>EBNF</i></summary>

```ebnf
enum = [ "+" | "-" ] "#" identifier .
```
</details>

A Viv *enum literal* is an identifier preceded by `#`, optionally with a leading `+` or `-` sign to mark the sign of a numeric enum. Enum literals can be used anywhere literal values are allowed.

Examples:

```viv
#BORING
-#SMALL
+#BIG
```

## Tokenization example

Consider the following source file:

```viv
// Say hey!
action greet:
    gloss: "Greets a friend"
    roles:
        @greeter:  // Here's a trailing comment
            as: initiator
        @friend:
            as: recipient
```

In Viv, this file would be tokenized as follows:

```
action
greet
:
gloss
:
"Greets a friend"
roles
:
@
greeter
:
as
:
initiator
@
friend
:
as
:
recipient
```
