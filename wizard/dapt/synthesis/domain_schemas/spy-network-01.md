# Spy Network Schema

## Overview

A Cold War-era espionage network where handlers run field agents, analysts piece together intelligence, and double agents play both sides. The simulation foregrounds information asymmetry — who knows what about whom, the fragility of cover identities, and the cascading consequences of a blown cover. Narrative tension arises from trust and betrayal, the tension between operational security and the need to act on incomplete intelligence, and the ever-present threat that any ally might be feeding information to the other side.

## Character Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Character's display name |
| codename | string | Operational alias used in communications |
| role | enum | Function in the network (e.g., `#ROLE_HANDLER`, `#ROLE_FIELD_AGENT`) |
| allegiance | enum | True loyalty (e.g., `#ALLEGIANCE_WEST`, `#ALLEGIANCE_EAST`) — may differ from apparent allegiance |
| coverIdentity | string | Assumed civilian identity used to avoid detection |
| coverIntegrity | number | How intact the character's cover remains; drops when suspicious actions are observed |
| suspicion | number | How much scrutiny this character is under from opposing intelligence services |
| tradecraft | number | Skill at covert operations — dead drops, surveillance detection, encryption |
| loyalty | number | Commitment to their handler or agency; low values indicate vulnerability to turning |
| nerve | number | Composure under pressure; low values risk panicked mistakes or defection |
| handler | UID | The character who manages this agent's operations |
| contacts | UID[] | Known associates, informants, and assets in the field |
| knownIdentities | UID[] | Characters whose true identity this character has discovered |
| suspectedDoubles | UID[] | Characters this person suspects of being double agents |

## Item Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Item's display name |
| category | enum | Kind of item (e.g., `#ITEM_INTEL_DOC`, `#ITEM_COMM_DEVICE`) |
| classification | enum | Secrecy level (e.g., `#CLASS_CONFIDENTIAL`, `#CLASS_TOP_SECRET`) |
| reliability | number | Assessed trustworthiness of the intelligence; low values suggest disinformation |
| compromised | boolean | Whether the opposition is known or suspected to have accessed this item |
| holder | UID | Character currently in possession |
| originAgent | UID | Field agent who originally obtained or produced this item |

## Location Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Location's display name |
| category | enum | Type of location (e.g., `#LOC_SAFE_HOUSE`, `#LOC_DEAD_DROP`) |
| surveillance | number | Level of hostile observation on this location; high values make operations risky |
| compromised | boolean | Whether the opposition has identified this location |
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
| ROLE_HANDLER | 10 | Senior officer who directs field agents and manages operations |
| ROLE_FIELD_AGENT | 11 | Operative deployed in hostile territory to gather intelligence |
| ROLE_DOUBLE_AGENT | 12 | Agent secretly working for the opposing side while appearing loyal |
| ROLE_ANALYST | 13 | Intelligence analyst who synthesizes raw data into assessments |
| ROLE_COURIER | 14 | Agent who transports documents and materials between operatives |
| ROLE_ASSET | 15 | Local contact recruited to provide information or access |
| ROLE_COUNTERINTEL | 16 | Officer tasked with identifying moles and double agents |
| ALLEGIANCE_WEST | 20 | True loyalty lies with Western intelligence |
| ALLEGIANCE_EAST | 21 | True loyalty lies with Eastern bloc intelligence |
| ALLEGIANCE_SELF | 22 | Loyal only to personal survival or profit |
| ITEM_INTEL_DOC | 30 | Intelligence document — dossier, cipher text, report |
| ITEM_COMM_DEVICE | 31 | Communication equipment — one-time pad, shortwave radio, dead-drop container |
| ITEM_FORGED_PAPERS | 32 | Fabricated identity documents — passport, work permit, travel visa |
| ITEM_SURVEILLANCE | 33 | Surveillance gear — camera, listening device, tracking beacon |
| ITEM_WEAPON | 34 | Concealed weapon — pistol, garrote, poison capsule |
| ITEM_CIPHER | 35 | Encryption key or codebook used to decode intercepted communications |
| CLASS_CONFIDENTIAL | 40 | Low-sensitivity intelligence |
| CLASS_SECRET | 41 | Sensitive intelligence requiring restricted access |
| CLASS_TOP_SECRET | 42 | Highest sensitivity; exposure would compromise active operations |
| LOC_SAFE_HOUSE | 50 | Secure meeting location maintained by the network |
| LOC_DEAD_DROP | 51 | Concealed exchange point for passing materials without direct contact |
| LOC_EMBASSY | 52 | Diplomatic compound used as a base of operations |
| LOC_PUBLIC_VENUE | 53 | Café, park, or market used for brush passes and signal sites |
| LOC_BORDER_CROSSING | 54 | Controlled checkpoint between East and West |
| LOC_BLACK_SITE | 55 | Clandestine interrogation or detention facility |

## Custom Functions

| Name | Arguments | Description |
|------|-----------|-------------|
| moveToNewLocation | (characterID: UID) | Relocates a character to a new location |
| conductDeadDrop | (senderID: UID, receiverID: UID, itemID: UID, locationID: UID) | Sender leaves an item at a dead-drop location for the receiver to retrieve |
| runSurveillance | (observerID: UID, targetID: UID) | Observer monitors a target, potentially discovering contacts or cover inconsistencies |
| assessIntelligence | (analystID: UID, itemIDs: UID[]) | Analyst evaluates a set of intelligence items, scoring reliability and identifying patterns |
| attemptTurn | (handlerID: UID, targetID: UID) | Handler tries to recruit or flip a target agent; outcome depends on target's loyalty and nerve |
| blowCover | (exposerID: UID, targetID: UID) | Reveals a character's true identity to the opposing side, destroying their cover |
| extractAgent | (handlerID: UID, agentID: UID) | Emergency extraction of a compromised agent from hostile territory |
