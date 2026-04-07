---
title: 5. Entities and symbols
---

This chapter describes the Viv type universe, meaning the kinds of things that can be cast in [roles](09-roles.md).

## Simulated storyworld

Viv interacts with a running simulation instance managed by the [host application](20-runtime-model.md#host-application), which in Viv parlance is often called the *simulated storyworld*, or just *storyworld*.

## Entities

An *entity* is a persistent thing in the [simulated storyworld](#simulated-storyworld).

Each entity has a unique identifier called an *entity ID*, which is a string provisioned by the host application, and persistent data that the [Viv runtime](20-runtime-model.md) may read and write via the host application's [Viv adapter](20-runtime-model.md#adapter).

## Entity types

There are four entity types in Viv:

* **Characters.** Characters initiate actions, participate in them in other ways, and witness events as bystanders. They also form [memories](20-runtime-model.md#knowledge-manager) when they experience or otherwise learn about actions, which can be searched via [queries](15-queries.md) and [sifting patterns](16-sifting-patterns.md). The Viv runtime [assumes](20-runtime-model.md#assumptions) that each character is in a discrete storyworld location at any given point.

* **Items.** Items are inanimate objects in the storyworld that characters can involve in actions. While the exact sense of 'item' depends on the [host application](20-runtime-model.md#host-application), items do not take action or form memories. [Knowledge](20-runtime-model.md#knowledge-manager) about past actions can be [inscribed](07-expressions.md#inscriptions) onto items and later revealed to characters via [inspection](07-expressions.md#inspections). As with characters, the Viv runtime [assumes](20-runtime-model.md#assumptions) that each item is in a discrete storyworld location at any given point.

* **Locations.** Locations are discrete storyworld locales that characters can involve in actions. They are also the places where characters and items may be located.

* **Actions.** Past actions are themselves entities to which subsequent actions can refer. Critically, the Viv runtime tracks [causal relations](20-runtime-model.md#causal-bookkeeping) between actions, which enables [story sifting](16-sifting-patterns.md).

[Roles](09-roles.md) and [variables](06-names.md) binding entity values are prefixed with the [entity sigil](06-names.md#type-sigils) `@`.

## Symbols

A *symbol* is a value that does not correspond to an entity in the [host application](20-runtime-model.md#host-application).

Generally speaking, a [symbol role](09-roles.md#symbol-roles) allows an author to hoist an arbitrary value into the core data for an action (or another [construct](03-file-structure.md)). As an example, consider the  `&evidence` role here, which provides additional flavor to the action by selecting from a [list literal](02-lexical-elements.md#lists) of [strings](02-lexical-elements.md#strings) serving a one-off [casting pool](09-roles.md#casting-pool):

```viv
action botched-burglary:
    gloss: "@burglar burgled and left &evidence at the scene"
    roles:
        @burglar:
            as: initiator
        &evidence:
            as: symbol
            from: ["fingerprints", "a strand of hair", "their wallet"]
```

[Scratch variables](10-actions.md#scratch) and [local variables](08-statements-and-control-flow.md#local-variables) can also take symbol values. As with symbol roles, the [binding type](06-names.md#type-sigils) is marked by the [symbol sigil](06-names.md#type-sigils) `&`: `$&thing`, `_&thing`.

## Role labels by type

The mapping between types and [role labels](09-roles.md#labels) is as follows. Note that [symbols](#symbols) are not entities, but they can be cast in roles.

| Type | Role labels |
|-------------|-------------|
| Character   | `character`, `initiator`, `partner`, `recipient`, `bystander` |
| Item        | `item` |
| Location    | `location` |
| Action      | `action` |
| Symbol      | `symbol` |
