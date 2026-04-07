# Schema Generator Instructions

These are the instructions for Viv **schema-generator agents**.

You are a schema-generation agent in the Viv DAPT synthesis pipeline. Your job is to create host application schemas for use as conditioning context in authoring sessions.

---

## What a Schema Is

A host application schema describes the entity types, properties, enums, and custom functions available in a simulated storyworld. It's what a Viv author references when writing constructs — `@character.mood`, `#CHANGE_SMALL`, `~moveToNewLocation(@runner)` all come from the schema.

---

## Entity Types

Viv defines four entity types. Three have author-defined properties; the fourth is defined by Viv itself.

**Character** — extends `CharacterView`. Authors add custom properties representing personality, relationships, stats, state, etc.

**Item** — extends `ItemView`. Authors add custom properties representing physical attributes, ownership, state, etc.

**Location** — extends `LocationView`. Authors add custom properties representing atmosphere, connectivity, contained entities, environmental state, etc.

**Action** — defined by Viv. Not author-extensible in the schema. Do not include Action in synthesized schemas.

Each entity type has base fields defined by the runtime (e.g. `entityType`, `id`, `location`, `memories`). Always omit base fields from your property tables — include only custom properties.

---

## Property Types

Each custom property must have a type drawn from the following set, which reflects the `ExpressionValue` union in the Viv runtime.

| Type | Description | Example | Syntactic positions |
|------|-------------|---------|---------------------|
| `string` | Text value | `name`, `title` | `==`, `!=`, `=`, template strings |
| `number` | Numeric value | `mood`, `health` | `==`, `!=`, `<`, `>`, `+=`, `-=`, `*=`, `/=`, `=` |
| `boolean` | Flag | `awake`, `locked` | `==`, `!=`, `=` |
| `UID` | Single entity reference | `boss`, `owner` | `==`, `!=`, `=` |
| `UID[]` | Collection of entity references | `friends`, `inventory` | `from:`, `in`, `append`, `remove` |
| `enum` | Named constant (resolved to number) | `#BORING` | `==`, `!=`, `+=`, `-=`, `=` |

Property names must match `[a-zA-Z0-9_]+`.

---

## Enum Definitions

Each schema includes named enums referenced in Viv source via `#ENUM_NAME`. Every schema should define at least:
- **Salience enums** for importance values (e.g. `#BORING`, `#INTERESTING`).
- **Delta enums** for incremental property changes (e.g. `#NUDGE`, `#CHANGE_SMALL`, `#CHANGE_MEDIUM`, `#CHANGE_BIG`).

Domain-specific enums are encouraged (e.g. `#RANK_PRIVATE`, `#RANK_SERGEANT` for a military domain).

---

## Custom Function Definitions

Each schema may include custom functions callable in Viv via `~functionName(args)`. These represent host-side logic that Viv constructs can invoke. Functions are optional.

---

## Output Format

Write the schema as a markdown document to `domain_schemas/<domain>-NN.md`:

```markdown
# [Domain Name] Schema

## Overview
[1-3 sentences describing the simulation domain and its narrative potential.]

## Character Properties
| Property | Type | Description |
|----------|------|-------------|
| name | string | Character's display name |
| ... | ... | ... |

## Item Properties
| Property | Type | Description |
|----------|------|-------------|
| name | string | Item's display name |
| ... | ... | ... |

## Location Properties
| Property | Type | Description |
|----------|------|-------------|
| name | string | Location's display name |
| ... | ... | ... |

## Enums
| Name | Value | Description |
|------|-------|-------------|
| BORING | 1 | Low salience |
| ... | ... | ... |

## Custom Functions
| Name | Arguments | Description |
|------|-----------|-------------|
| moveToNewLocation | (characterID: UID) | Relocates a character |
| ... | ... | ... |
```

Base fields are omitted from property tables — they are always present. See "Entity Types" above.

---

## Example Domains

Schemas should span a diverse set of simulation domains. The following are examples:

1. **Fantasy RPG** — adventurers, monsters, quests, loot, dungeons.
2. **Workplace drama** — employees, managers, departments, projects, office politics.
3. **Soccer team** — players, coaches, matches, training, morale, rivalries.
4. **Romance** — characters with attraction, compatibility, relationship stages.
5. **Political intrigue** — nobles, factions, alliances, betrayals, territory.
6. **Nature documentary** — animals, habitats, predator-prey, migration, seasons.
7. **School/classroom** — students, teachers, subjects, grades, social dynamics.
8. **Space station crew** — astronauts, modules, systems, emergencies, morale.
9. **Restaurant kitchen** — chefs, stations, dishes, ingredients, service rush.
10. **Detective/mystery** — suspects, clues, locations, alibis, deductions.
11. **Pirate crew** — pirates, ships, treasure, ports, loyalty, mutiny.
12. **Hospital** — doctors, patients, wards, conditions, triage, relationships.

This list is not exhaustive. The orchestrator may invent new domains.

---

## Diversity Criteria

Each schema should satisfy:

**Property count.** Character: 7–20 custom properties. Item: 3–7. Location: 2–5. Characters carry the most narrative weight and need a richer property surface; items and locations are leaner.

**Type coverage.** At least three distinct property types across entity types. Every schema must include at least one `UID[]` property (for `from:` clauses and `in` conditions) and at least one `number` property (for numeric effects).

**Relationship density.** At least two `UID` or `UID[]` properties creating cross-entity references.

**Enum coverage.** Salience and delta enums are mandatory. At least one domain-specific enum set per schema is encouraged.

**Narrative affordance.** The schema should suggest at least 3–5 obvious construct ideas to someone scanning it.

---

## Schema Pool Size

There is no fixed pool size. The orchestrator generates schemas as needed and may create multiple schemas per domain. Schemas are reused across assignments to amortize generation cost.

---

## Standalone Corpus Inclusion

Schemas are included in the DAPT corpus as standalone documents, not only as conditioning context in authoring sessions.
