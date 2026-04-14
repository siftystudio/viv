---
title: 10. Actions
---

<details>
<summary><i>EBNF</i></summary>

```ebnf
action = action_header ":" action_body
       | action_header ";" .
```
</details>

An *action definition*, or just *action*, is made up of a [header](#action-header) and a [body](#action-body). The body is optional for actions that inherit from a parent action, as explained in the section below on [inheritance](#inheritance).

## Action header

<details>
<summary><i>EBNF</i></summary>

```ebnf
action_header             = [ reserved_construct_marker | template_action_marker ] "action" identifier [ parent_action_declaration ] .
reserved_construct_marker = "reserved" .
template_action_marker    = "template" .
parent_action_declaration = "from" identifier .
```
</details>

An *action header* introduces an action definition. It declares whether the action is [reserved](#reserved-marker) or a [template](#template-marker), its [name](#action-name), and its [parent definition](#inheritance), if any. Here are some examples:

```viv
action insult:
    ...

action ridicule from insult;

action specific-insult from insult:
    ...

reserved action plot-revenge:
    ...

reserved action plot-arson from plot-revenge:
    ...

template action social-template:
    ...
```

An action header terminating with `:` [MUST](01-introduction.md#normative-language) be followed by an [action body](#action-body):

```viv del={1-2}
// Illegal
action bad:
```

```viv ins={1-3}
// Legal
action good:
    ...
```

When an action header terminates with `;`, the definition terminates too, but this is only legal when a parent action is specified:

```viv ins={4-5} del={7-8}
action parent:
    ...

// Legal
action child from parent;

// Illegal
action head-only;
```

### Action name

An *action name* is an [identifier](02-lexical-elements.md#identifiers). Each action in a [content bundle](19-compiler-output.md) must have a unique name. As such, uniqueness is enforced across [includes](04-includes.md). For instance, if a file `F1` defines an action `foo`, and a file `F2` defines an action `foo`, the compiler [SHALL](01-introduction.md#normative-language) throw an error if `F1` is (recursively) included in `F2` (or vice versa). Such cases are resolved by renaming one of the actions.

### Reserved marker

The *reserved marker* `reserved` is used to introduce the definition for a *reserved action*—one that may only be targeted via a [reaction](11-reactions.md) or through [selector targeting](18-selectors.md):

```viv
// This is a reserved action
reserved action foo:
    ...
```

If neither the `reserved` nor `template` marker is present, the definition specifies a *general action*—one that may be targeted anytime:

```viv
// This is a general action
action foo:
    ...
```

An action [MUST](01-introduction.md#normative-language) be marked `reserved` if it has any non-initiator [precast](09-roles.md#labels) roles, since there is no way to cast a precast role via general action targeting. (The `initiator` role is automatically precast by the compiler, so its presence alone does not require the `reserved` marker.)

### Template marker

The *template marker* `template` marks the action as a *template action*—one that is intended solely for [inheritance](#inheritance) and will not appear in the [content bundle](19-compiler-output.md) as a standalone action:

```viv
// This action exists only to be inherited from
template action base-social:
    ...

action greet from base-social:
    ...
```

### Inheritance declaration

Using the `from` keyword, an author may specify a single parent action from which the definition at hand will [inherit](#inheritance):

```viv
// This action, 'foo', is a child of 'bar'
action foo from bar:
    ...
```

## Inheritance

Viv supports *inheritance* between action definitions, where the definition of a *child action* incorporates material from the definition of a *parent action*.

### Policy

A child action duplicates the parent action, with the following modifications:

* The child action uses its own [action name](#action-name).

* Regardless of whether the parent action is [marked reserved](#reserved-marker), the child action is reserved only if it is itself marked reserved.

* If a [field](#action-body) is not present in the child action, the child duplicates the parent field.

* If a field is present in the child action and is not introduced by the `join` keyword, the child overrides the parent field.

* If a field is present in the child action and is introduced by the `join` keyword, the fields will be *joined* according to a field-specific policy. These policies are explained [below](#action-body) in the respective field sections.

Here is an illustrative example:

```viv
action parent:
    roles:
        @foo:
            as: initiator
    conditions:
        @foo.baz
    effects:
        @foo.mood += 10

// This action is named 'child', and it is reserved
reserved action child from parent:
    // Roles will be joined
    join roles:
        @bar:
            as: recipient
    // This will be the sole condition of 'child'
    conditions:
        @foo.mood > 10
    // 'child' will duplicate all other fields
```

### Field joinability

Only *joinable* fields may be joined during inheritance:

* **Joinable:** [tags](#tags), [roles](#roles), [conditions](#conditions), [scratch](#scratch), [effects](#effects), [reactions](#reactions), [embargoes](#embargoes).

* **Non-joinable:** [gloss](#gloss), [report](#report), [importance](#importance), [saliences](#saliences), [associations](#associations).

Non-joinable fields [MUST NOT](01-introduction.md#normative-language) be introduced by the `join` keyword:

```viv
action parent:
    ...

action child from parent:
    // Legal for this field
    join roles:
        ...
    // Legal regardless of field
    gloss: ...
    // Illegal for this field
    join report: ...
```

### Inheritance chaining

Inheritance chaining is supported:

```viv
action grandparent:
    ...

action parent from grandparent:
    ...

action child from parent:
    ...
```

Cycles are not permitted in inheritance chains, meaning the following example will result in an error:

```viv
action foo from bar:
    ...

action bar from foo:
    ...
```

### Multiple inheritance

Multiple inheritance is not supported. A child action [MUST](01-introduction.md#normative-language) have a single parent action.

## Action body

<details>
<summary><i>EBNF</i></summary>

```ebnf
(* Each field MUST NOT appear more than once in an action body. *)
action_body  = action_field { action_field } .
action_field = gloss_field | report_field | importance_field
             | saliences_field | associations_field
             | tags_field | roles_field | conditions_field
             | scratch_field | effects_field | reactions_field
             | embargoes_field .
```
</details>

An *action body* combines one or more *action fields*: [gloss](#gloss), [report](#report), [importance](#importance), [tags](#tags), [roles](#roles), [conditions](#conditions), [scratch](#scratch), [effects](#effects), [reactions](#reactions), [saliences](#saliences), [associations](#associations), [embargoes](#embargoes).

Unless the body is part of a child action—meaning one that [inherits](#inheritance) from a parent action—the roles field [MUST](01-introduction.md#normative-language) be present. All other fields are optional. A given field [MUST NOT](01-introduction.md#normative-language) appear multiple times within an action definition.

The fields may appear in any order. Only [joinable](#field-joinability) fields may be introduced by the `join` keyword.

## Gloss

<details>
<summary><i>EBNF</i></summary>

```ebnf
action_gloss = "gloss" ":" string .
```
</details>

The *gloss field* is introduced by the `gloss` keyword, and specifies how to briefly describe an instance of this action. The field accepts either a [string](02-lexical-elements.md#strings) or [template string](02-lexical-elements.md#template-strings):

```viv
action foo:
    // String literals are permitted
    gloss: "Something happens"
    ...

action bar:
    // Template strings are also permitted
    gloss: "@person did something"
    roles:
        @person:
            as: initiator
```

The gloss field is optional and is not [joinable](#field-joinability).

## Report

<details>
<summary><i>EBNF</i></summary>

```ebnf
action_report = "report" ":" string .
```
</details>

The *report field* is introduced by the `report` keyword, and specifies (at more length than a [gloss](#gloss)) how to describe an instance of this action. Like the gloss field, the report field accepts either a [string](02-lexical-elements.md#strings) or [template string](02-lexical-elements.md#template-strings).

The report field is optional and is not [joinable](#field-joinability).

## Importance

<details>
<summary><i>EBNF</i></summary>

```ebnf
action_importance = "importance" ":" ( enum | number ) .
```
</details>

The *importance field* is introduced by the `importance` keyword, and specifies a numeric score indicating the significance of the action for purposes of [story sifting](16-sifting-patterns.md). The value may be a [number](02-lexical-elements.md#numbers) or an [enum](02-lexical-elements.md#enums):

```viv
action gossip:
    importance: 3
    ...

action murder:
    importance: #LIFE_CHANGING
    ...
```

The importance field is optional and is not [joinable](#field-joinability).

## Tags

<details>
<summary><i>EBNF</i></summary>

```ebnf
action_tags = [ "join" ] "tags" ":" tags .
tags        = tag { "," tag } .
tag         = identifier .
```
</details>

The *tags field* is introduced by the `tags` keyword, and specifies a set of one or more annotations that will be attached to all instances of this action. Tags are comma-separated [identifiers](02-lexical-elements.md#identifiers) (not [strings](02-lexical-elements.md#strings)):

```viv del={1-4}
// Illegal: tags must be identifiers, not strings
action foo:
    tags: "fun"
    ...
```

```viv ins={1-4}
// Legal
action foo:
    tags: fun, cool
    ...
```

While their function can be extended on the host application, tags are intended to facilitate search over the chronicle for purposes of [story sifting](16-sifting-patterns.md).

The tags field is optional. It is also [joinable](#field-joinability), with a simple concatenation policy: the child and parent tags are concatenated, with deduplication.

## Roles

<details>
<summary><i>EBNF</i></summary>

```ebnf
action_roles = [ "join" ] "roles" ":" role+ .
```
</details>

The *roles field* is introduced by the `roles` keyword, and specifies the cast of [entities](05-entities-and-symbols.md#entities) and [symbols](05-entities-and-symbols.md#symbols) that may be involved in an instance of the action at hand. There [MUST](01-introduction.md#normative-language) be a single `initiator` role, but otherwise there are no constraints on the total number of roles or their respective [labels](09-roles.md#labels).

For full details on role definitions, see the [Roles](09-roles.md) chapter.

The roles field is required. It is also [joinable](#field-joinability): when joined, the child's role definitions are merged with the parent's, as explained in [Role joining](09-roles.md#role-joining).

## Conditions

<details>
<summary><i>EBNF</i></summary>

```ebnf
action_conditions = [ "join" ] "conditions" ":" statements .
```
</details>

The *conditions field* is introduced by the `conditions` keyword, and specifies a block of [statements](08-statements-and-control-flow.md) that must all evaluate to truthy values in order for the action to be performed with a given prospective cast. Conditions are tested during [action targeting](20-runtime-model.md#action-targeting).

```viv
action befriend:
    conditions:
        @person.sociability > 50
        @target.openness > 30
        !(@person == @target)
    roles:
        @person:
            as: initiator
        @target:
            as: recipient
```

The conditions field is optional. It is also [joinable](#field-joinability): when joined, the child's conditions are appended to the parent's.

## Scratch

<details>
<summary><i>EBNF</i></summary>

```ebnf
action_scratch = [ "join" ] "scratch" ":" statements .
```
</details>

The *scratch field* is introduced by the `scratch` keyword, and specifies a block of [statements](08-statements-and-control-flow.md) that prepare temporary variables for use elsewhere in the action definition. Scratch variables are prefixed with the [scratch sigil](06-names.md#scope-sigils) `$`:

```viv
action negotiate:
    scratch:
        $@mediator = ~findMediator(@buyer, @seller)
        $&price = (@buyer.budget + @seller.asking) / 2
    conditions:
        $@mediator != null
    effects:
        @buyer.gold -= $&price
        @seller.gold += $&price
    roles:
        @buyer:
            as: initiator
        @seller:
            as: recipient
```

The scratch field is optional. It is also [joinable](#field-joinability): when joined, the child's scratch statements are appended to the parent's.

## Effects

<details>
<summary><i>EBNF</i></summary>

```ebnf
action_effects = [ "join" ] "effects" ":" statements .
```
</details>

The *effects field* is introduced by the `effects` keyword, and specifies a block of [statements](08-statements-and-control-flow.md) that are executed when an instance of the action is performed. Effects typically mutate host-application state via [assignment expressions](07-expressions.md#assignments) and [custom function calls](07-expressions.md#custom-function-calls):

```viv
action insult:
    effects:
        @target.mood -= 10
        @target.opinion[@insulter] -= 5
    roles:
        @insulter:
            as: initiator
        @target:
            as: recipient
```

The effects field is optional. It is also [joinable](#field-joinability): when joined, the child's effects are appended to the parent's.

## Reactions

<details>
<summary><i>EBNF</i></summary>

```ebnf
action_reactions = [ "join" ] "reactions" ":" ( conditional | loop | reaction )+ .
```
</details>

The *reactions field* is introduced by the `reactions` keyword, and specifies a block of [reaction declarations](11-reactions.md) that may cause other actions, selectors, or plans to be queued in response to an instance of this action. Reactions may be wrapped in [conditionals](08-statements-and-control-flow.md#conditionals) and [loops](08-statements-and-control-flow.md#loops).

For full details on reaction declarations, see the [Reactions](11-reactions.md) chapter.

The reactions field is optional. It is also [joinable](#field-joinability): when joined, the child's reactions are appended to the parent's.

## Saliences

<details>
<summary><i>EBNF</i></summary>

```ebnf
action_saliences = "saliences" ":" saliences_body .
saliences_body   = (* unordered, each field optional *)
                   [ saliences_default ]
                   [ saliences_roles ]
                   [ saliences_custom_field ] .
saliences_default     = "default" ":" ( enum | number ) .
saliences_roles       = "roles" ":" saliences_roles_entry+ .
saliences_roles_entry = "@" identifier [ group_role_decorator ] ":" ( enum | number ) .
saliences_custom_field = "for" local_variable ":" statement+ "end" .
```
</details>

The *saliences field* is introduced by the `saliences` keyword, and specifies how to determine the numeric *salience* score for this action as experienced by a given character. Salience represents how memorable or significant the action is from that character's perspective.

The saliences body has three optional subfields:

* **`default`:** A fallback salience value (a [number](02-lexical-elements.md#numbers) or [enum](02-lexical-elements.md#enums)) used for any character for which no more specific rule applies.

* **`roles`:** A mapping from entity role names to salience values. For a character bound in a given role, the corresponding value determines their salience.

* **`for`:** A custom computation block. A [local variable](08-statements-and-control-flow.md#local-variables) is bound to the character at hand, and the block's [statements](08-statements-and-control-flow.md) are evaluated in turn. The first numeric result becomes the character's salience. This field is only consulted for characters to whom no `roles` entry applies.

The resolution order is: `roles`, then `for`, then `default`.

```viv
action betray:
    saliences:
        default: #MODERATE
        roles:
            @betrayer: #HIGH
            @victim: #EXTREME
            @witnesses*: #LOW
        for _@witness:
            if _@witness.perceptiveness > 80:
                #HIGH
            end
    ...
```

The saliences field is optional and is not [joinable](#field-joinability).

## Associations

<details>
<summary><i>EBNF</i></summary>

```ebnf
action_associations = "associations" ":" associations_body .
associations_body   = (* unordered, each field optional *)
                      [ associations_default ]
                      [ associations_roles ]
                      [ associations_custom_field ] .
associations_default     = "default" ":" tags .
associations_roles       = "roles" ":" associations_roles_entry+ .
associations_roles_entry = "@" identifier [ group_role_decorator ] ":" tags .
associations_custom_field = "for" local_variable ":" associations_statement+ "end" .
```
</details>

The *associations field* is introduced by the `associations` keyword, and specifies the subjective *associations*—tag-like annotations—that a character will attach to their memory of this action. Like [saliences](#saliences), associations are per-character.

The associations body has three optional subfields, mirroring the structure of [saliences](#saliences):

* **`default`:** A fallback set of association [tags](02-lexical-elements.md#identifiers).

* **`roles`:** A mapping from entity role names to association tags.

* **`for`:** A custom computation block, structured like the saliences custom field but yielding tag lists instead of numbers.

```viv
action betray:
    associations:
        default: social, betrayal
        roles:
            @betrayer: guilt, scheming
            @victim: trauma, betrayal
            @witnesses*: gossip
    ...
```

The associations field is optional and is not [joinable](#field-joinability).

## Embargoes

<details>
<summary><i>EBNF</i></summary>

```ebnf
action_embargoes = [ "join" ] "embargoes" ":" embargo+ .
embargo          = "embargo" ":" embargo_body .
embargo_body     = (* unordered, each field optional *)
                   [ embargo_location ]
                   [ embargo_time_period ]
                   [ embargo_roles ] .
embargo_location        = "location" ":" ( "here" | "anywhere" ) .
embargo_time_period     = "time" ":" ( "forever" | time_period ) .
embargo_roles           = "roles" ":" role_reference { "," role_reference } .
```
</details>

The *embargoes field* is introduced by the `embargoes` keyword, and specifies one or more *embargo declarations* that constrain the subsequent performance of this action. An embargo prevents the action from being targeted again (for the specified roles, location, and time period) after an instance has been performed.

Each embargo declaration is introduced by the `embargo` keyword and has three optional subfields:

* **`location`:** Either `here` (the embargo holds only at the location where the action was performed) or `anywhere` (the embargo holds everywhere).

* **`time`:** Either `forever` (the embargo is permanent) or a [time period](12-temporal-constraints.md) specifying the duration.

* **`roles`:** A comma-separated list of [role references](09-roles.md#role-reference) specifying which role bindings the embargo tracks. For instance, if only the initiator is specified, the embargo applies to any future instance with the same initiator, regardless of other bindings.

```viv
action confess:
    embargoes:
        embargo:
            location: here
            time: 2 weeks
            roles: @confessor

        embargo:
            location: anywhere
            time: forever
            roles: @confessor, @confidant
    ...
```

The embargoes field is optional. It is also [joinable](#field-joinability): when joined, the child's embargo declarations are appended to the parent's.
