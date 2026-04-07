# Pirate Ship Schema

## Overview

Life aboard a pirate vessel, where crew dynamics are governed by a volatile mix of greed, loyalty, superstition, and the ever-present threat of mutiny. The simulation tracks the social hierarchy — captain, quartermaster, bosun, deckhands — alongside the material realities of navigation, plunder, and ship maintenance. Narrative tension emerges from competing loyalties, uneven treasure splits, and the thin line between authority and revolt.

## Character Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Character's display name |
| rank | enum | Position in the crew hierarchy (e.g., `#RANK_CAPTAIN`, `#RANK_DECKHAND`) |
| loyalty | number | Devotion to the current captain; low values signal mutiny risk |
| plunderShare | number | Accumulated share of treasure from raids |
| sailingSkill | number | Competence at seamanship — navigation, rigging, combat maneuvers |
| superstition | number | How strongly the character heeds omens, curses, and sea lore |
| crewmates | UID[] | Fellow crew members this character regularly interacts with |
| grudges | UID[] | Characters this person harbors resentment toward |

## Item Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Item's display name |
| category | enum | Kind of item (e.g., `#ITEM_WEAPON`, `#ITEM_TREASURE`, `#ITEM_MAP`) |
| value | number | Worth in coin or barter; drives disputes over division |
| cursed | boolean | Whether the item is believed to carry a supernatural curse |
| owner | UID | Character currently in possession |
| claimedBy | UID[] | Characters who believe they have a rightful claim to this item |

## Location Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Location's display name |
| category | enum | Type of location (e.g., `#LOC_DECK`, `#LOC_HOLD`, `#LOC_PORT`) |
| condition | number | Structural integrity; degrades in storms and combat |
| heading | string | Current compass bearing or destination, if aboard the ship |
| secure | boolean | Whether the location is locked or guarded |
| occupants | UID[] | Characters currently present |
| connectedTo | UID[] | Adjacent or reachable locations |
| cargo | UID[] | Items stowed at this location |

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
| RANK_CAPTAIN | 10 | Commands the ship and crew |
| RANK_QUARTERMASTER | 11 | Manages supplies, mediates disputes, represents crew interests |
| RANK_BOSUN | 12 | Oversees rigging, deck work, and discipline |
| RANK_NAVIGATOR | 13 | Charts courses and reads the stars |
| RANK_GUNNER | 14 | Commands the cannons during engagements |
| RANK_DECKHAND | 15 | General-purpose sailor; lowest rank |
| ITEM_WEAPON | 20 | Cutlass, pistol, or other armament |
| ITEM_TREASURE | 21 | Gold, jewels, or other valuable plunder |
| ITEM_MAP | 22 | Chart, treasure map, or navigational document |
| ITEM_PROVISION | 23 | Food, rum, fresh water, or medical supplies |
| ITEM_RELIC | 24 | Mysterious artifact — possibly cursed, possibly priceless |
| LOC_DECK | 30 | Main deck, exposed to weather and combat |
| LOC_HOLD | 31 | Below-deck cargo and storage area |
| LOC_CABIN | 32 | Captain's quarters or officer berths |
| LOC_BRIG | 33 | Makeshift cell for prisoners or mutineers |
| LOC_CROWS_NEST | 34 | Lookout perch atop the mast |
| LOC_PORT | 35 | Dockside town for resupply, recruitment, and carousing |
| SEA_CALM | 40 | Smooth sailing, no hazards |
| SEA_ROUGH | 41 | Choppy waters, minor risk |
| SEA_STORM | 42 | Full gale, significant danger to ship and crew |
| SEA_BECALMED | 43 | No wind; supplies dwindle while the ship sits idle |

## Custom Functions

| Name | Arguments | Description |
|------|-----------|-------------|
| moveToNewLocation | (characterID: UID) | Relocates a character to a new location |
| dividePlunder | (characterIDs: UID[]) | Splits loot among specified crew, adjusting plunderShare and loyalty |
| callMutiny | (instigatorID: UID) | Initiates a mutiny vote; loyalty values determine the outcome |
| setSail | (locationID: UID, heading: string) | Changes the ship's heading to a new destination |
| boardEnemy | (characterIDs: UID[]) | Sends crew members to board a target vessel |
