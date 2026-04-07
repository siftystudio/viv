# Summer Camp Schema

## Overview

A lakeside summer camp where campers and counselors navigate the charged social landscape of shared cabins, competitive activities, and unsupervised downtime. Cliques form and fracture, rivalries erupt over capture-the-flag and talent-show glory, secret crushes circulate as campfire rumors, and homesickness threatens to unravel even the tightest cabin bonds. The tension between belonging and independence — and between what counselors see and what actually happens — drives the narrative.

## Character Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Character's display name |
| role | enum | Camp role (e.g., `#ROLE_CAMPER`, `#ROLE_COUNSELOR`, `#ROLE_DIRECTOR`) |
| popularity | number | Social standing among peers; high values attract followers, low values invite exclusion |
| trust | number | Willingness to confide in and rely on others; eroded by betrayal or gossip |
| homesickness | number | Longing for home; high values cause withdrawal, tears, or attempts to leave |
| boldness | number | Willingness to break rules, take dares, or speak up; low values mean conformity |
| crush | UID | The character this person has a secret (or not-so-secret) attraction to |
| friends | UID[] | Characters this person actively hangs out with and trusts |
| rivals | UID[] | Characters this person competes with or resents |

## Item Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Item's display name |
| category | enum | Kind of item (e.g., `#ITEM_CONTRABAND`, `#ITEM_TROPHY`, `#ITEM_LETTER`) |
| sentimental | boolean | Whether the item has strong emotional significance to its owner |
| desirability | number | How badly others want this item; drives theft, trades, and bargaining |
| owner | UID | Character currently in possession |
| knownTo | UID[] | Characters who know this item exists or where it is hidden |

## Location Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Location's display name |
| category | enum | Type of location (e.g., `#LOC_CABIN`, `#LOC_LAKE`, `#LOC_MESS_HALL`) |
| privacy | number | How easy it is to have a conversation without being overheard; high values enable secrets |
| fun | number | How enjoyable or stimulating this location is; affects morale when characters spend time here |
| supervised | boolean | Whether a counselor or staff member is currently monitoring this location |
| occupants | UID[] | Characters currently present |
| connectedTo | UID[] | Adjacent or reachable locations |
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
| ROLE_CAMPER | 10 | Standard-age camper attending for the summer |
| ROLE_COUNSELOR | 11 | Older teen or young adult supervising a cabin |
| ROLE_CIT | 12 | Counselor-in-training; caught between camper and staff identities |
| ROLE_DIRECTOR | 13 | Camp director overseeing all operations and staff |
| ROLE_SPECIALIST | 14 | Activity instructor — archery, swimming, crafts, etc. |
| ITEM_CONTRABAND | 20 | Smuggled candy, phone, fireworks, or other banned goods |
| ITEM_TROPHY | 21 | Award or prize from a camp competition |
| ITEM_LETTER | 22 | Letter from home or a passed note between campers |
| ITEM_CRAFT | 23 | Handmade friendship bracelet, lanyard, or art project |
| ITEM_DARE_TOKEN | 24 | Object proving completion of a dare or secret challenge |
| LOC_CABIN | 30 | Sleeping quarters shared by a group of campers and a counselor |
| LOC_LAKE | 31 | Waterfront area for swimming, canoeing, and dockside gossip |
| LOC_MESS_HALL | 32 | Communal dining space; seating arrangements are political |
| LOC_CAMPFIRE | 33 | Fire pit clearing; site of stories, songs, and late-night confessions |
| LOC_ARCHERY_RANGE | 34 | Supervised activity area for target practice |
| LOC_CRAFTS_CABIN | 35 | Indoor workspace for arts, crafts, and bracelet-making |
| LOC_WOODS | 36 | Forested trails surrounding camp; unsupervised and slightly forbidden |
| LOC_INFIRMARY | 37 | Nurse's station; refuge for the homesick and the injured |
| SKILL_NONE | 40 | No proficiency in an activity |
| SKILL_BEGINNER | 41 | Basic familiarity; still learning |
| SKILL_INTERMEDIATE | 42 | Competent; can participate confidently |
| SKILL_ADVANCED | 43 | Highly skilled; stands out in competitions |

## Custom Functions

| Name | Arguments | Description |
|------|-----------|-------------|
| moveToNewLocation | (characterID: UID) | Relocates a character to a new camp location |
| spreadRumor | (sourceID: UID, targetID: UID, locationID: UID) | A character spreads gossip about the target to everyone at the location |
| startActivity | (locationID: UID) | Begins a supervised activity at the location, drawing nearby campers |
| confiscateItem | (counselorID: UID, itemID: UID) | A counselor seizes contraband or a disputed item from its owner |
| callCabinMeeting | (locationID: UID) | Summons all characters assigned to a cabin for a group discussion |
