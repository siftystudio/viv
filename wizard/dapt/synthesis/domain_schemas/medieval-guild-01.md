# Medieval Guild Schema

## Overview

A medieval city's guild system where artisans, merchants, and apprentices compete for commissions, negotiate trade rights, and jockey for political influence. The simulation tracks craft production, guild hierarchy, economic competition, and inter-guild politics. Narrative tension emerges from apprenticeship rivalries, contested commissions, trade disputes, and the backroom dealings that decide who sits on the guild council.

## Character Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Character's display name |
| rank | enum | Position in the guild hierarchy (e.g., `#RANK_MASTER`, `#RANK_APPRENTICE`) |
| guild | enum | The guild this character belongs to (e.g., `#GUILD_SMITHS`, `#GUILD_WEAVERS`) |
| craftSkill | number | Proficiency at the character's primary trade; determines commission quality |
| standing | number | Reputation and political capital within the character's guild |
| wealth | number | Accumulated coin from commissions, trade, and patronage |
| ambition | number | Drive to advance in rank and influence; high values push risky moves |
| mentor | UID | The master who oversees this character's training, if any |
| allies | UID[] | Characters this person cooperates with for political or economic advantage |
| rivals | UID[] | Characters this person competes against or bears ill will toward |

## Item Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Item's display name |
| category | enum | Kind of item (e.g., `#ITEM_MATERIAL`, `#ITEM_PRODUCT`, `#ITEM_CONTRACT`) |
| quality | number | Craftsmanship or material grade; higher values fetch better prices |
| value | number | Market price in coin |
| claimed | boolean | Whether this item has been spoken for by a commission or contract |
| creator | UID | Character who crafted or sourced this item |
| requiredMaterials | UID[] | Materials needed to complete a commission tied to this item |

## Location Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Location's display name |
| category | enum | Type of location (e.g., `#LOC_GUILDHALL`, `#LOC_WORKSHOP`, `#LOC_MARKET`) |
| prosperity | number | Economic vitality; affects trade volume and commission availability |
| controlledBy | UID | Guild or character who holds authority over this location |
| occupants | UID[] | Characters currently present |
| connectedTo | UID[] | Adjacent or reachable locations |
| inventory | UID[] | Items currently stored or displayed at this location |

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
| RANK_GRANDMASTER | 10 | Head of an entire guild; sits on the city council |
| RANK_MASTER | 11 | Fully credentialed artisan; may take apprentices and vote in guild matters |
| RANK_JOURNEYMAN | 12 | Certified craftsman working under a master or independently |
| RANK_APPRENTICE | 13 | Trainee bound to a master; limited rights within the guild |
| GUILD_SMITHS | 20 | Blacksmiths, armorers, and metalworkers |
| GUILD_WEAVERS | 21 | Textile workers, dyers, and tailors |
| GUILD_MASONS | 22 | Stonecutters, builders, and architects |
| GUILD_MERCHANTS | 23 | Traders, importers, and moneylenders |
| GUILD_APOTHECARIES | 24 | Herbalists, alchemists, and healers |
| ITEM_MATERIAL | 30 | Raw material — ore, timber, wool, pigment |
| ITEM_PRODUCT | 31 | Finished good — sword, tapestry, tonic |
| ITEM_CONTRACT | 32 | Written commission or trade agreement |
| ITEM_TOOL | 33 | Specialized instrument for a craft — anvil, loom, chisel |
| ITEM_TOKEN | 34 | Guild seal, writ of privilege, or proof of membership |
| LOC_GUILDHALL | 40 | Administrative seat of a guild; hosts meetings and votes |
| LOC_WORKSHOP | 41 | Artisan's workspace where goods are crafted |
| LOC_MARKET | 42 | Public square for buying, selling, and bartering |
| LOC_WAREHOUSE | 43 | Bulk storage for raw materials and finished goods |
| LOC_COUNCIL_CHAMBER | 44 | City hall where guild leaders negotiate policy and settle disputes |
| LOC_TAVERN | 45 | Informal meeting ground for deal-making and gossip |
| VOTE_YEA | 50 | In favor of the motion |
| VOTE_NAY | 51 | Against the motion |
| VOTE_ABSTAIN | 52 | Deliberately withholding a vote |

## Custom Functions

| Name | Arguments | Description |
|------|-----------|-------------|
| moveToNewLocation | (characterID: UID) | Relocates a character to a new location |
| fulfillCommission | (creatorID: UID, contractID: UID) | Completes a commission, awarding wealth and standing based on quality |
| callGuildVote | (motionText: string, guildHall: UID) | Initiates a formal vote among guild members present at the hall |
| promoteRank | (characterID: UID) | Advances a character to the next rank if standing and skill thresholds are met |
| negotiateTrade | (partyA: UID, partyB: UID) | Opens a trade negotiation between two characters, resolved by wealth and standing |
| formAlliance | (guildA: UID, guildB: UID) | Establishes a political alliance between two guilds, affecting council votes |
