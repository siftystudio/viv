# Boarding School Schema

## Overview

A prestigious boarding school organized into rival houses, where academic ambition, social maneuvering, and extracurricular competition shape every relationship. Students navigate a rigid hierarchy of prefects, faculty favorites, and unwritten social codes while pursuing — or concealing — involvement in secret societies and forbidden activities. The simulation tracks reputation across multiple axes (popularity, academic standing, disciplinary record) so that a single incident can cascade through the entire social web.

## Character Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Character's display name |
| role | enum | Position within the school (e.g., `#ROLE_STUDENT`, `#ROLE_PREFECT`, `#ROLE_FACULTY`) |
| house | enum | Assigned house or dormitory (e.g., `#HOUSE_ASHWORTH`, `#HOUSE_LYNDHURST`) |
| popularity | number | Social standing among peers; high values confer influence, low values invite bullying |
| academicRank | number | Scholarly performance; determines class placement and faculty favor |
| discipline | number | Behavioral record; low values attract scrutiny and punishment |
| ambition | number | Drive to advance socially or academically; shapes decision-making |
| loyalty | number | Faithfulness to allies, house, or secret affiliations |
| allies | UID[] | Characters this person actively supports or conspires with |
| rival | UID | A specific character this person competes against or resents |

## Item Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Item's display name |
| category | enum | Kind of item (e.g., `#ITEM_CONTRABAND`, `#ITEM_ACADEMIC`, `#ITEM_TROPHY`) |
| value | number | Importance or desirability; high-value items provoke theft and bargaining |
| forbidden | boolean | Whether possession violates school rules |
| owner | UID | Character currently holding or hiding this item |
| coveredBy | UID[] | Characters who know about this item's existence or location |

## Location Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Location's display name |
| category | enum | Type of space (e.g., `#LOC_CLASSROOM`, `#LOC_DORMITORY`, `#LOC_GROUNDS`) |
| prestige | number | Social weight of being seen here; some locations confer status |
| supervised | boolean | Whether faculty or prefects regularly monitor this area |
| restricted | boolean | Whether students need permission or a key to enter |
| occupants | UID[] | Characters currently present |
| connectedTo | UID[] | Adjacent or easily reachable locations |
| containedItems | UID[] | Items currently stored or hidden here |

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
| ROLE_STUDENT | 10 | Ordinary enrolled student |
| ROLE_PREFECT | 11 | Student leader with disciplinary authority within a house |
| ROLE_HEAD_PREFECT | 12 | Senior prefect overseeing all houses |
| ROLE_FACULTY | 13 | Teacher or administrator with full institutional authority |
| ROLE_GROUNDSKEEPER | 14 | Non-academic staff who knows the campus's hidden corners |
| HOUSE_ASHWORTH | 20 | Known for academic excellence and ruthless competition |
| HOUSE_LYNDHURST | 21 | Known for athletic prowess and fierce house loyalty |
| HOUSE_SELWYN | 22 | Known for artistic talent and iconoclastic nonconformity |
| HOUSE_DRAYCOTT | 23 | Known for political savvy and social networking |
| ITEM_CONTRABAND | 30 | Forbidden possession — alcohol, exam answers, restricted books |
| ITEM_ACADEMIC | 31 | Textbook, notebook, or study aid |
| ITEM_TROPHY | 32 | Award, medal, or house cup with reputational significance |
| ITEM_SECRET | 33 | Diary, letter, or evidence of someone's hidden activities |
| ITEM_KEY | 34 | Physical key or access card to a restricted area |
| LOC_CLASSROOM | 40 | Teaching space; supervised during class hours |
| LOC_DORMITORY | 41 | House sleeping quarters; semi-private |
| LOC_COMMON_ROOM | 42 | House social space; unsupervised after hours |
| LOC_LIBRARY | 43 | Study space; quiet, monitored, with restricted sections |
| LOC_GROUNDS | 44 | Outdoor campus — quad, playing fields, gardens |
| LOC_CHAPEL | 45 | Formal assembly space; used for ceremonies and secret meetings |
| LOC_BASEMENT | 46 | Utility tunnels and storage beneath the main building |
| LOC_HEADMASTER_OFFICE | 47 | Seat of institutional power; restricted access |

## Custom Functions

| Name | Arguments | Description |
|------|-----------|-------------|
| moveToNewLocation | (characterID: UID) | Relocates a character to a new location |
| awardHousePoints | (house: enum, amount: number) | Adds or deducts points from a house's standing |
| reportMisconduct | (reporterID: UID, targetID: UID) | Files a disciplinary report, lowering the target's discipline score |
| initiateIntoSociety | (sponsorID: UID, recruitID: UID) | Inducts a character into a secret society, adding them to the sponsor's allies |
| confiscateItem | (authorityID: UID, itemID: UID) | A prefect or faculty member seizes a forbidden item |
| spreadRumor | (sourceID: UID, targetID: UID) | Circulates gossip about the target, affecting their popularity |
