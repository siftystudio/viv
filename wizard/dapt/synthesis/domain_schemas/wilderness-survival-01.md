# Wilderness Survival Schema

## Overview

A group of survivors stranded in remote wilderness after a plane crash must contend with dwindling resources, harsh environmental conditions, injuries, and fractured group dynamics. Narrative tension arises from leadership disputes, rationing dilemmas, conflicting survival strategies, and the slow erosion of morale as rescue remains uncertain. The schema affords multi-step planning — organizing rescue signals, scouting for water, building shelters — alongside interpersonal drama driven by trust, skill asymmetries, and the pressure of life-or-death decisions.

## Character Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Character's display name |
| role | enum | Survival function (e.g., `#ROLE_LEADER`, `#ROLE_MEDIC`, `#ROLE_SCOUT`) |
| health | number | Physical condition; decreases from injury, illness, or deprivation |
| morale | number | Psychological resilience; eroded by hardship, conflict, and hopelessness |
| fatigue | number | Accumulated exhaustion; high values impair judgment and physical ability |
| trust | number | General standing with the group; shifts with decisions and perceived competence |
| allies | UID[] | Characters this person cooperates with or confides in |
| rival | UID | A character this person is in open conflict or competition with |

## Item Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Item's display name |
| category | enum | Kind of item (e.g., `#ITEM_TOOL`, `#ITEM_FOOD`, `#ITEM_MEDICAL`) |
| quantity | number | Remaining supply count or charges; consumed through use |
| condition | number | Durability or freshness; degrades over time or with use |
| portable | boolean | Whether the item can be carried by a single person |
| heldBy | UID | Character currently carrying or controlling this item |
| claimedBy | UID[] | Characters who assert ownership or priority access to this item |

## Location Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Location's display name |
| terrain | enum | Type of terrain (e.g., `#TERRAIN_FOREST`, `#TERRAIN_RIDGE`, `#TERRAIN_RIVER`) |
| exposure | number | Vulnerability to weather; higher values mean less natural shelter |
| dangerLevel | number | Risk of environmental hazards — predators, rockfalls, flash floods |
| hasWater | boolean | Whether a usable water source is present |
| scouted | boolean | Whether the group has explored and mapped this area |
| occupants | UID[] | Characters currently present |
| connectedTo | UID[] | Adjacent areas reachable on foot |
| stashedItems | UID[] | Items cached or stored at this location |

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
| ROLE_LEADER | 10 | Self-appointed or elected group leader; makes final calls |
| ROLE_MEDIC | 11 | Has medical knowledge; handles injuries and illness |
| ROLE_SCOUT | 12 | Explores the surroundings and reports on hazards or resources |
| ROLE_ENGINEER | 13 | Builds shelters, tools, and signal devices from salvage |
| ROLE_HUNTER | 14 | Procures food through foraging, trapping, or fishing |
| ROLE_NAVIGATOR | 15 | Reads terrain, weather, and stars to orient the group |
| ROLE_OUTSIDER | 16 | No defined role; distrusted or recently arrived |
| ITEM_TOOL | 20 | Knife, rope, tarp, axe, or other utility equipment |
| ITEM_FOOD | 21 | Rations, foraged plants, hunted game, or preserved stores |
| ITEM_WATER | 22 | Canteen, purification tablets, or collected rainwater |
| ITEM_MEDICAL | 23 | First-aid supplies, splints, antiseptic, medication |
| ITEM_SIGNAL | 24 | Mirror, flare, radio, or fire-starting material for rescue signals |
| ITEM_SALVAGE | 25 | Wreckage or debris repurposable for shelter or tools |
| TERRAIN_FOREST | 30 | Dense tree cover; offers concealment and firewood, limits visibility |
| TERRAIN_CLEARING | 31 | Open ground; good for signaling but exposed to weather |
| TERRAIN_RIDGE | 32 | Elevated terrain; vantage point but difficult to traverse |
| TERRAIN_RIVER | 33 | Waterway; provides water and fish but poses crossing hazards |
| TERRAIN_CAVE | 34 | Natural shelter; protection from elements but limited egress |
| TERRAIN_WRECKAGE | 35 | Crash site; initial base of operations and salvage source |
| TERRAIN_SWAMP | 36 | Wet lowland; insects, disease risk, difficult footing |
| WEATHER_CLEAR | 40 | Fair conditions; no environmental pressure |
| WEATHER_RAIN | 41 | Steady rain; raises fatigue, enables water collection |
| WEATHER_STORM | 42 | Severe weather; dangerous exposure, movement restricted |
| WEATHER_HEAT | 43 | Extreme heat; accelerates dehydration and exhaustion |
| WEATHER_COLD | 44 | Freezing temperatures; hypothermia risk without shelter or fire |

## Custom Functions

| Name | Arguments | Description |
|------|-----------|-------------|
| moveToNewLocation | (characterID: UID) | Relocates a character to a new area |
| rationSupplies | (itemID: UID, characterIDs: UID[]) | Divides a consumable resource among specified survivors, reducing quantity |
| buildShelter | (characterIDs: UID[], locationID: UID) | Constructs or improves shelter at a location, reducing its exposure |
| signalForRescue | (characterIDs: UID[], itemID: UID) | Uses a signal item to attempt contact with rescuers |
| scoutArea | (characterID: UID, locationID: UID) | Sends a character to explore an unscouted location, revealing its properties |
| treatInjury | (medicID: UID, patientID: UID, itemID: UID) | Uses medical supplies to restore a character's health |
