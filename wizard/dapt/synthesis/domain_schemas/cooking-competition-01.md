# Cooking Competition Schema

## Overview

A competitive cooking show where contestants face elimination rounds, forge alliances, and navigate rivalries under the pressure of timed challenges. The simulation tracks both the social layer — contestant relationships, judge opinions, backstage politicking — and the cooking mechanics: ingredient management, dish quality, station assignments. Narrative tension emerges from the gap between culinary skill and social maneuvering.

## Character Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Character's display name |
| role | enum | Role in the competition (e.g., `#ROLE_CONTESTANT`, `#ROLE_JUDGE`) |
| skill | number | Overall cooking ability |
| composure | number | Grace under pressure; drops during timed rounds |
| reputation | number | Public perception and standing in the competition |
| signature | string | The contestant's signature cuisine or technique |
| allies | UID[] | Contestants this character cooperates with or protects |
| rival | UID | A specific contestant this character sees as a threat |
| favoredBy | UID[] | Judges who view this character positively |

## Item Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Item's display name |
| category | enum | Kind of item (e.g., `#ITEM_INGREDIENT`, `#ITEM_DISH`, `#ITEM_UTENSIL`) |
| quality | number | Freshness, grade, or craftsmanship of the item |
| claimed | boolean | Whether a contestant has reserved or taken this item |
| owner | UID | Character currently in possession |
| usedIn | UID[] | Dishes or stations this item has been incorporated into |

## Location Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Location's display name |
| category | enum | Type of location (e.g., `#LOC_STATION`, `#LOC_PANTRY`) |
| capacity | number | How many contestants can work here simultaneously |
| stocked | boolean | Whether this location currently has available supplies |
| occupants | UID[] | Characters currently present |
| connectedTo | UID[] | Adjacent or accessible locations |
| assignedTo | UID | Contestant assigned to this station, if any |

## Enums

| Name | Value | Description |
|------|-------|-------------|
| BORING | 1 | Low salience |
| NOTEWORTHY | 2 | Moderate salience |
| INTERESTING | 3 | High salience |
| CRITICAL | 4 | Highest salience |
| NUDGE | 1 | Tiny incremental change |
| CHANGE_SMALL | 2 | Small incremental change |
| CHANGE_MEDIUM | 4 | Moderate incremental change |
| CHANGE_BIG | 7 | Large incremental change |
| ROLE_CONTESTANT | 10 | A competing chef |
| ROLE_JUDGE | 11 | Evaluates dishes and decides eliminations |
| ROLE_HOST | 12 | Announces challenges and narrates the competition |
| ROLE_MENTOR | 13 | Advises contestants without competing |
| ITEM_INGREDIENT | 20 | Raw or prepared cooking ingredient |
| ITEM_DISH | 21 | A completed or in-progress plate |
| ITEM_UTENSIL | 22 | Cooking tool or appliance |
| ITEM_SECRET_INGREDIENT | 23 | A surprise or premium ingredient introduced mid-round |
| LOC_STATION | 30 | An individual contestant's cooking workspace |
| LOC_PANTRY | 31 | Shared ingredient storage area |
| LOC_JUDGES_TABLE | 32 | Where dishes are presented and evaluated |
| LOC_BACKSTAGE | 33 | Off-camera area for confessionals and scheming |
| LOC_PREP_AREA | 34 | Shared workspace for initial preparation |
| ROUND_APPETIZER | 40 | First elimination round |
| ROUND_ENTREE | 41 | Main course round |
| ROUND_DESSERT | 42 | Final round |
| ROUND_MYSTERY_BOX | 43 | Challenge with unknown required ingredients |
| ROUND_TEAM | 44 | Collaborative round forcing alliance dynamics |
| OPINION_HOSTILE | 50 | Judge or contestant holds strong negative view |
| OPINION_SKEPTICAL | 51 | Judge or contestant has doubts |
| OPINION_NEUTRAL | 52 | No strong opinion either way |
| OPINION_FAVORABLE | 53 | Positive impression |
| OPINION_CHAMPION | 54 | Actively rooting for this contestant |

## Custom Functions

| Name | Arguments | Description |
|------|-----------|-------------|
| moveToNewLocation | (characterID: UID) | Relocates a character to a new location |
| eliminateContestant | (characterID: UID) | Removes a contestant from the competition |
| scoresDish | (judgeID: UID, dishID: UID) | A judge evaluates a dish, affecting contestant reputation |
| revealSecretIngredient | (itemID: UID) | Introduces a surprise ingredient that all contestants must use |
| formAlliance | (characterID1: UID, characterID2: UID) | Two contestants agree to cooperate, updating their allies lists |
