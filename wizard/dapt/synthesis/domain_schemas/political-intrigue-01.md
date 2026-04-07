# Political Intrigue Schema

## Overview

A court of nobles, advisors, and operatives navigate factional power struggles, succession crises, and espionage in a pre-modern political setting. Allegiances shift as characters accumulate influence, trade secrets, and maneuver for positional advantage. The tension between public reputation and private schemes drives narrative — what is known matters as much as what is true.

## Character Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Character's display name |
| title | string | Formal rank or style (e.g., "Duke of Ashenmere") |
| faction | enum | Political bloc this character belongs to (e.g., `#FACTION_CROWN`, `#FACTION_REFORM`) |
| influence | number | Accumulated political capital; spent to push agendas or block rivals |
| reputation | number | Public standing; high values confer legitimacy, low values invite contempt |
| suspicion | number | How closely others scrutinize this character's motives |
| loyalty | number | Steadfastness to current faction versus openness to defection |
| allies | UID[] | Characters this person actively cooperates with |
| patron | UID | The more powerful figure this character serves or depends on |
| secrets | UID[] | Items representing compromising information this character holds |

## Item Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Item's display name |
| category | enum | Kind of item (e.g., `#ITEM_SECRET`, `#ITEM_DECREE`, `#ITEM_TOKEN`) |
| sensitivity | number | How dangerous possession of this item is to its holder |
| forged | boolean | Whether the item is a fabrication or counterfeit |
| holder | UID | Character currently in possession |
| subject | UID | The character or entity this item pertains to |
| knownTo | UID[] | Characters aware of this item's existence |

## Location Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Location's display name |
| category | enum | Type of location (e.g., `#LOC_THRONE_ROOM`, `#LOC_DUNGEON`) |
| prestige | number | Social weight of being seen here; high-prestige locations amplify actions |
| security | number | How difficult it is to act covertly in this location |
| controlled | boolean | Whether a single faction currently dominates this location |
| controller | UID | The character or faction figurehead who controls access |
| occupants | UID[] | Characters currently present |
| connectedTo | UID[] | Adjacent or reachable locations |

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
| FACTION_CROWN | 10 | Loyalists backing the current monarch |
| FACTION_REFORM | 11 | Coalition seeking constitutional limits on royal power |
| FACTION_OLD_GUARD | 12 | Traditionalist nobles defending hereditary privilege |
| FACTION_CLERGY | 13 | Religious authorities wielding moral and institutional power |
| FACTION_SHADOW | 14 | Covert network operating outside formal structures |
| FACTION_PRETENDER | 15 | Backers of a rival claimant to the throne |
| ITEM_SECRET | 20 | Compromising information — letters, confessions, witnessed acts |
| ITEM_DECREE | 21 | Official document carrying legal or political force |
| ITEM_TOKEN | 22 | Symbolic object conferring authority or legitimacy (seal, signet, relic) |
| ITEM_BRIBE | 23 | Wealth or favors packaged for exchange |
| ITEM_POISON | 24 | Means of covert elimination |
| LOC_THRONE_ROOM | 30 | Seat of sovereign power; public audiences and decrees |
| LOC_COUNCIL_CHAMBER | 31 | Where the ruling council convenes in closed session |
| LOC_CHAPEL | 32 | Religious space; sanctuary and site of oaths |
| LOC_DUNGEON | 33 | Underground prison; interrogation and confinement |
| LOC_GARDEN | 34 | Semi-private outdoor space favored for clandestine meetings |
| LOC_QUARTERS | 35 | Private chambers; scheming and correspondence |
| LOC_GATE | 36 | Controlled entry point; border between court and outside world |
| RANK_SOVEREIGN | 40 | Reigning monarch |
| RANK_HEIR | 41 | Recognized successor to the throne |
| RANK_DUKE | 42 | Highest-ranking noble beneath the crown |
| RANK_COUNT | 43 | Mid-ranking noble with regional authority |
| RANK_KNIGHT | 44 | Lower noble or sworn retainer |
| RANK_COMMONER | 45 | No noble rank; influence derived from skill or patronage |

## Custom Functions

| Name | Arguments | Description |
|------|-----------|-------------|
| moveToNewLocation | (characterID: UID) | Relocates a character to a new location |
| shiftAllegiance | (characterID: UID, newFaction: enum) | Moves a character to a different faction, adjusting loyalty |
| exposeSecret | (itemID: UID) | Reveals a secret publicly, damaging its subject's reputation |
| callCouncil | (locationID: UID) | Summons all council-eligible characters to a location |
| denounce | (accuserID: UID, targetID: UID) | Publicly accuses a character, raising their suspicion and risking the accuser's reputation |
