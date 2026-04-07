# Heist Crew Schema

## Overview

A crew of specialists plan and execute high-stakes heists against heavily secured targets. Interpersonal dynamics — trust, rivalry, loyalty, competence hierarchies — drive the narrative as much as the jobs themselves. The tension between individual self-interest and collective success creates opportunities for betrayal, improvisation under pressure, and shifting alliances.

## Character Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Character's display name |
| role | enum | Crew specialty (e.g., `#ROLE_MASTERMIND`, `#ROLE_HACKER`) |
| nerve | number | Composure under pressure; depletes during jobs |
| loyalty | number | Commitment to the crew versus self-interest |
| heat | number | Law-enforcement attention on this individual |
| reputation | number | Standing in the criminal underworld |
| crewmates | UID[] | Other crew members this character knows and works with |
| rival | UID | A specific crew member this character resents or competes with |
| trusts | UID[] | Characters this person genuinely trusts |

## Item Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Item's display name |
| category | enum | Kind of item (e.g., `#ITEM_TOOL`, `#ITEM_WEAPON`, `#ITEM_INTEL`) |
| concealed | boolean | Whether the item is hidden from plain sight |
| reliability | number | How likely the item is to work when needed |
| owner | UID | Character currently in possession |
| requiredFor | UID[] | Plan phases or locations this item is needed at |

## Location Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Location's display name |
| security | number | How heavily guarded or surveilled the location is |
| familiarity | number | How well the crew knows this location's layout |
| accessible | boolean | Whether the crew can currently enter |
| category | enum | Type of location (e.g., `#LOC_VAULT`, `#LOC_SAFEHOUSE`) |
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
| ROLE_MASTERMIND | 10 | Plans the job and coordinates the crew |
| ROLE_HACKER | 11 | Handles electronic security, comms, surveillance |
| ROLE_SAFECRACKER | 12 | Defeats physical locks, vaults, safes |
| ROLE_WHEELMAN | 13 | Drives getaway vehicles, manages transport logistics |
| ROLE_GRIFTER | 14 | Social engineering, disguises, fast talk |
| ROLE_MUSCLE | 15 | Physical enforcement, intimidation, protection |
| ROLE_INSIDE_MAN | 16 | Embedded operative with access to the target |
| ITEM_TOOL | 20 | Specialized equipment for the job |
| ITEM_WEAPON | 21 | Lethal or non-lethal weapon |
| ITEM_INTEL | 22 | Blueprints, schedules, codes, dossiers |
| ITEM_DISGUISE | 23 | Costume, fake ID, or cover identity |
| ITEM_LOOT | 24 | Stolen goods or currency |
| LOC_VAULT | 30 | The primary target location |
| LOC_SAFEHOUSE | 31 | Crew hideout or planning base |
| LOC_PUBLIC | 32 | Open area — street, plaza, lobby |
| LOC_RESTRICTED | 33 | Access-controlled area within the target |
| LOC_ESCAPE_ROUTE | 34 | Corridor, tunnel, or vehicle staging point for extraction |
| PHASE_RECON | 40 | Scouting and intelligence gathering |
| PHASE_PREP | 41 | Acquiring tools, rehearsing, positioning |
| PHASE_EXECUTION | 42 | The heist itself |
| PHASE_ESCAPE | 43 | Extraction and getaway |
| PHASE_AFTERMATH | 44 | Dividing spoils, covering tracks, dealing with fallout |

## Custom Functions

| Name | Arguments | Description |
|------|-----------|-------------|
| moveToNewLocation | (characterID: UID) | Relocates a character to a new location |
| triggerAlarm | (locationID: UID) | Raises the alarm at a location, increasing security |
| divvyLoot | (characterIDs: UID[]) | Distributes loot among specified characters, adjusting loyalty |
| blowCover | (characterID: UID) | Exposes a character's identity, spiking their heat |
