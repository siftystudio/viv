# Haunted Mansion Schema

## Overview

A group of investigators — paranormal enthusiasts, skeptics, mediums, and thrill-seekers — explore a sprawling haunted mansion plagued by restless spirits, cursed objects, and inexplicable phenomena. The narrative tension arises from the interplay between fear and curiosity, the divide between believers and skeptics, and the escalating supernatural forces that respond to the investigators' presence.

## Character Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Character's display name |
| archetype | enum | Investigator role (e.g., `#ARCH_MEDIUM`, `#ARCH_SKEPTIC`) |
| fear | number | Current fear level; high values cause panic or flight |
| courage | number | Baseline resistance to fear; depletes under sustained hauntings |
| sanity | number | Mental stability; eroded by supernatural encounters |
| belief | number | Conviction that the supernatural is real; shifts with evidence |
| companions | UID[] | Other characters this person stays close to |
| nemesis | UID | A spirit or character this person is specifically entangled with |

## Item Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Item's display name |
| category | enum | Kind of item (e.g., `#ITEM_RELIC`, `#ITEM_WARD`, `#ITEM_EVIDENCE`) |
| cursed | boolean | Whether the item carries a supernatural curse |
| potency | number | Strength of the item's supernatural properties |
| owner | UID | Character currently holding or carrying the item |
| attunedTo | UID[] | Spirits or characters the item is supernaturally linked to |

## Location Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Location's display name |
| dread | number | Ambient supernatural intensity; higher values provoke manifestations |
| category | enum | Type of room (e.g., `#ROOM_SEALED`, `#ROOM_SANCTUARY`) |
| lit | boolean | Whether the room is currently illuminated |
| explored | boolean | Whether investigators have already searched this room |
| occupants | UID[] | Characters currently present in this room |
| connectedTo | UID[] | Adjacent rooms or passages |
| containedItems | UID[] | Items currently located here |

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
| ARCH_MEDIUM | 10 | Psychic sensitive who channels spirits |
| ARCH_SKEPTIC | 11 | Rationalist who seeks natural explanations |
| ARCH_OCCULTIST | 12 | Scholar of the arcane and forbidden knowledge |
| ARCH_THRILL_SEEKER | 13 | Adrenaline-driven explorer with poor self-preservation |
| ARCH_CARETAKER | 14 | Long-time resident or staff with knowledge of the mansion's history |
| ARCH_SPIRIT | 15 | Ghost or supernatural entity bound to the mansion |
| ITEM_RELIC | 20 | Object with historical or supernatural significance |
| ITEM_WARD | 21 | Protective charm, salt circle, holy symbol |
| ITEM_EVIDENCE | 22 | Photograph, recording, or document of paranormal activity |
| ITEM_KEY | 23 | Physical or metaphysical key to a sealed area |
| ITEM_CURSED_OBJECT | 24 | Object that inflicts harm or misfortune on its holder |
| ITEM_RITUAL_TOOL | 25 | Candle, board, mirror, or other séance implement |
| ROOM_GRAND | 30 | Large, open room — ballroom, foyer, gallery |
| ROOM_INTIMATE | 31 | Small, enclosed space — study, closet, nursery |
| ROOM_SEALED | 32 | Locked or boarded-up room requiring a key or force to enter |
| ROOM_SANCTUARY | 33 | Consecrated or warded space where spirits cannot easily manifest |
| ROOM_NEXUS | 34 | Focal point of supernatural energy — séance room, crypt, attic |
| ROOM_PASSAGE | 35 | Hidden corridor, servant tunnel, or secret stairway |
| HAUNT_RESIDUAL | 40 | Echo of past events; no awareness, repeats endlessly |
| HAUNT_INTELLIGENT | 41 | Aware entity that reacts to the living |
| HAUNT_POLTERGEIST | 42 | Violent telekinetic manifestation |
| HAUNT_POSSESSION | 43 | Spirit attempting to inhabit a living body |

## Custom Functions

| Name | Arguments | Description |
|------|-----------|-------------|
| moveToNewLocation | (characterID: UID) | Relocates a character to a new room |
| triggerManifestation | (locationID: UID) | Causes a supernatural event at the location, raising dread |
| conductSeance | (characterIDs: UID[], locationID: UID) | Initiates a séance, potentially contacting spirits and shifting belief |
| applyCurse | (itemID: UID, characterID: UID) | Attaches a cursed item's effect to a character, eroding sanity |
| wardRoom | (locationID: UID, itemID: UID) | Uses a protective item to reduce a room's dread |
