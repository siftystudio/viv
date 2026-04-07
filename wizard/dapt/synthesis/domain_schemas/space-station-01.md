# Space Station Schema

## Overview

A crewed orbital station with multiple departments sustains operations under constant resource pressure and the ever-present threat of system failure. Crew dynamics — competence hierarchies, interpersonal trust, stress responses, and chain-of-command friction — drive the narrative as much as the technical emergencies themselves. Conflicting mission priorities force characters to choose between safety, science, loyalty, and self-preservation.

## Character Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Character's display name |
| department | enum | Crew specialty (e.g., `#DEPT_ENGINEERING`, `#DEPT_SCIENCE`) |
| rank | enum | Position in the chain of command (e.g., `#RANK_COMMANDER`, `#RANK_SPECIALIST`) |
| competence | number | Technical skill and reliability under normal conditions |
| stress | number | Accumulated psychological pressure; high values impair judgment |
| morale | number | Willingness to cooperate and endure hardship |
| trust | number | General trustworthiness as perceived by the rest of the crew |
| authority | number | Effective command weight; combines rank, respect, and situation |
| trustedBy | UID[] | Crew members who rely on or confide in this character |
| superior | UID | The character this person reports to in the chain of command |

## Item Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Item's display name |
| category | enum | Kind of item (e.g., `#ITEM_TOOL`, `#ITEM_SUPPLY`, `#ITEM_DATA`) |
| condition | number | Operational integrity; degrades with use or damage |
| critical | boolean | Whether the station cannot function without this item |
| assignedTo | UID | Character currently responsible for or carrying this item |
| installedIn | UID | Module or location where this item is mounted or stored |
| requiredBy | UID[] | Characters or systems that depend on this item |

## Location Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Location's display name |
| category | enum | Type of module (e.g., `#MOD_COMMAND`, `#MOD_LAB`, `#MOD_ENGINEERING`) |
| oxygenLevel | number | Available breathable atmosphere; drops during breaches or failures |
| powerLevel | number | Available electrical power; drops during outages or overloads |
| integrity | number | Structural soundness; low values risk hull breach |
| pressurized | boolean | Whether the module currently holds atmosphere |
| occupants | UID[] | Characters currently present |
| connectedTo | UID[] | Adjacent modules reachable without EVA |

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
| DEPT_COMMAND | 10 | Station leadership and mission control liaison |
| DEPT_ENGINEERING | 11 | Hull maintenance, power systems, life support |
| DEPT_SCIENCE | 12 | Research operations and experiment oversight |
| DEPT_MEDICAL | 13 | Crew health, psychological evaluation, triage |
| DEPT_OPERATIONS | 14 | Logistics, communications, and scheduling |
| RANK_COMMANDER | 20 | Station commanding officer |
| RANK_LIEUTENANT | 21 | Second-in-command or department head |
| RANK_SPECIALIST | 22 | Trained crew member with a defined role |
| RANK_TECHNICIAN | 23 | Support crew handling maintenance and routine tasks |
| RANK_CIVILIAN | 24 | Non-military personnel — visiting scientist or journalist |
| ITEM_TOOL | 30 | Repair equipment, diagnostic gear, EVA hardware |
| ITEM_SUPPLY | 31 | Consumable resource — oxygen canister, food ration, water pack |
| ITEM_DATA | 32 | Research results, sensor logs, communication records |
| ITEM_MEDICAL | 33 | Medication, first-aid kit, surgical instrument |
| ITEM_COMPONENT | 34 | Replacement part for a station system |
| MOD_COMMAND | 40 | Bridge module; comms, navigation, and command decisions |
| MOD_LAB | 41 | Science laboratory; experiments and analysis |
| MOD_ENGINEERING | 42 | Reactor, life support machinery, repair bay |
| MOD_MEDBAY | 43 | Medical facility; treatment and quarantine |
| MOD_QUARTERS | 44 | Crew living quarters; rest and private conversation |
| MOD_AIRLOCK | 45 | Transition point for EVA or docking |
| MOD_CARGO | 46 | Storage for supplies, equipment, and specimens |
| ALERT_GREEN | 50 | Normal operations |
| ALERT_YELLOW | 51 | Caution; non-critical system anomaly |
| ALERT_RED | 52 | Emergency; immediate threat to crew or station |

## Custom Functions

| Name | Arguments | Description |
|------|-----------|-------------|
| moveToNewLocation | (characterID: UID) | Relocates a character to a new module |
| sealModule | (locationID: UID) | Seals a module's hatches, isolating it from the rest of the station |
| ventModule | (locationID: UID) | Vents atmosphere from a module, dropping its oxygen level to zero |
| redistributePower | (fromID: UID, toID: UID) | Transfers power from one module to another |
| declareAlert | (level: enum) | Sets the station-wide alert level, affecting crew stress and authority dynamics |
| relieveOfDuty | (commanderID: UID, targetID: UID) | A superior formally removes a subordinate from their post |
