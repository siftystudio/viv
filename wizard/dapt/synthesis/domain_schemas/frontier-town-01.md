# Frontier Town Schema

## Overview

A lawless settlement on the American frontier where settlers, outlaws, lawmen, and prospectors vie for land, gold, and influence. The simulation tracks economic competition — claims, deeds, supply scarcity — alongside social hierarchies built on reputation, firearm proficiency, and the fragile authority of law. Narrative tension emerges from the choice between legal and extralegal approaches to dispute resolution, the formation and betrayal of alliances, and the constant pressure of frontier hazards.

## Character Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Character's display name |
| occupation | enum | Role in the town (e.g., `#OCC_SHERIFF`, `#OCC_PROSPECTOR`, `#OCC_OUTLAW`) |
| wealth | number | Accumulated money and material assets |
| reputation | number | Social standing; high values command respect, low values invite contempt |
| gunSkill | number | Proficiency with firearms; determines outcomes of confrontations |
| wanted | number | Bounty level on this character's head; zero means no outstanding warrants |
| armed | boolean | Whether the character is currently carrying a weapon |
| allies | UID[] | Characters this person has a working alliance or partnership with |
| rival | UID | A specific character this person is locked in ongoing conflict with |

## Item Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Item's display name |
| category | enum | Kind of item (e.g., `#ITEM_DEED`, `#ITEM_WEAPON`, `#ITEM_SUPPLY`) |
| value | number | Worth in dollars; drives commerce and theft |
| legal | boolean | Whether possession of this item is lawful |
| owner | UID | Character currently in possession |
| claimants | UID[] | Characters who assert a right to this item or the asset it represents |

## Location Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Location's display name |
| category | enum | Type of location (e.g., `#LOC_SALOON`, `#LOC_CLAIM`, `#LOC_JAIL`) |
| prosperity | number | Economic activity level; high values attract newcomers and bandits |
| danger | number | Ambient threat from terrain, wildlife, or criminal activity |
| lawPresence | number | Strength of law enforcement; high values deter open crime |
| claimed | boolean | Whether this location is under a legal land claim |
| occupants | UID[] | Characters currently present |
| connectedTo | UID[] | Adjacent or reachable locations |
| storedGoods | UID[] | Items kept, stashed, or displayed at this location |

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
| OCC_SHERIFF | 10 | Town lawman; enforces order and serves warrants |
| OCC_DEPUTY | 11 | Appointed assistant to the sheriff |
| OCC_PROSPECTOR | 12 | Gold seeker working claims in the surrounding hills |
| OCC_RANCHER | 13 | Landowner raising livestock on the outskirts |
| OCC_MERCHANT | 14 | Shopkeeper or trader supplying goods to the town |
| OCC_OUTLAW | 15 | Bandit, rustler, or fugitive operating outside the law |
| OCC_GAMBLER | 16 | Card sharp or speculator living on wits and luck |
| OCC_DRIFTER | 17 | Unattached newcomer with no established role |
| ITEM_DEED | 20 | Legal title to land, a mine, or a building |
| ITEM_WEAPON | 21 | Revolver, rifle, shotgun, or knife |
| ITEM_SUPPLY | 22 | Food, water, medicine, ammunition, or building materials |
| ITEM_GOLD | 23 | Raw gold dust, nuggets, or refined bullion |
| ITEM_WARRANT | 24 | Legal document authorizing an arrest |
| ITEM_MAP | 25 | Prospecting map, survey, or directions to a hidden cache |
| LOC_SALOON | 30 | Drinking, gambling, and gossip hub |
| LOC_JAIL | 31 | Sheriff's office and holding cells |
| LOC_GENERAL_STORE | 32 | Dry goods, ammunition, and provisions |
| LOC_CLAIM | 33 | Mining site in the surrounding hills |
| LOC_RANCH | 34 | Homestead with livestock and open land |
| LOC_BANK | 35 | Vault for deposits, loans, and deed registration |
| LOC_TRAIL | 36 | Open road between settlements; exposed to ambush and weather |
| LOC_CAMP | 37 | Temporary encampment outside town limits |
| WEATHER_CLEAR | 40 | Fair skies, no travel impediment |
| WEATHER_DUST | 41 | Dust storm; reduced visibility, travel risk |
| WEATHER_HEAT | 42 | Extreme heat; water scarcity, exhaustion |
| WEATHER_STORM | 43 | Thunderstorm or flash flood; significant danger |

## Custom Functions

| Name | Arguments | Description |
|------|-----------|-------------|
| moveToNewLocation | (characterID: UID) | Relocates a character to a new location |
| fileClaim | (characterID: UID, locationID: UID) | Stakes a legal land or mining claim on an unclaimed location |
| issueWarrant | (sheriffID: UID, targetID: UID) | The sheriff issues an arrest warrant, raising the target's wanted level |
| formPosse | (leaderID: UID, memberIDs: UID[]) | Organizes a group to pursue an outlaw or defend a position |
| holdTrial | (accusedID: UID, locationID: UID) | Conducts a frontier trial; reputation and evidence determine the outcome |
| ambush | (attackerIDs: UID[], targetID: UID, locationID: UID) | Sets up an ambush at a location, with gunSkill determining the result |
