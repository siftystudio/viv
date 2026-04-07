# Traveling Circus Schema

## Overview

A traveling circus that moves between towns, where performers compete for spotlight acts while the ringmaster balances artistic ambition against crowd-pleasing spectacle and the hard economics of keeping the show profitable. The simulation tracks inter-performer rivalry, physical risk, showmanship, and the financial pressures of life on the road — all shadowed by a mysterious fortune teller whose predictions have an unsettling tendency to come true.

## Character Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Character's display name |
| role | enum | Position in the circus (e.g., `#ROLE_RINGMASTER`, `#ROLE_ACROBAT`, `#ROLE_FORTUNE_TELLER`) |
| showmanship | number | Ability to captivate an audience; determines act quality and crowd reaction |
| riskTolerance | number | Willingness to attempt dangerous stunts; high values yield spectacular or catastrophic outcomes |
| fame | number | Public renown; draws crowds but also fuels rivalry |
| morale | number | General satisfaction with life in the circus; low values trigger departure or sabotage |
| loyalty | number | Devotion to the circus troupe and its ringmaster |
| physicalCondition | number | Health and fitness; degrades with injuries from risky acts |
| wages | number | Accumulated pay; tied to act prominence and ticket revenue |
| specialty | string | The performer's signature act or skill (e.g., "fire breathing", "trapeze", "knife throwing") |
| rival | UID | A performer this character competes with for spotlight billing |
| mentor | UID | A senior performer who trained or sponsors this character |
| allies | UID[] | Fellow performers this character trusts and cooperates with |
| enemies | UID[] | Characters this person actively works against |

## Item Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Item's display name |
| category | enum | Kind of item (e.g., `#ITEM_PROP`, `#ITEM_COSTUME`, `#ITEM_ANIMAL`, `#ITEM_EQUIPMENT`) |
| condition | number | State of repair; worn or broken items degrade act quality |
| dangerous | boolean | Whether the item poses injury risk during use |
| spectacle | number | How visually impressive the item is; higher values boost showmanship |
| owner | UID | Character currently responsible for this item |

## Location Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Location's display name |
| category | enum | Type of location (e.g., `#LOC_BIG_TOP`, `#LOC_BACKSTAGE`, `#LOC_TOWN_SQUARE`) |
| crowdCapacity | number | Maximum audience size; constrains ticket revenue |
| atmosphere | number | Current mood of the location — festive, tense, hostile |
| occupants | UID[] | Characters currently present |
| connectedTo | UID[] | Adjacent or reachable locations |
| storedItems | UID[] | Items kept at this location |

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
| ROLE_RINGMASTER | 10 | Master of ceremonies; controls the show lineup and finances |
| ROLE_ACROBAT | 11 | Aerialist, trapeze artist, or tumbler |
| ROLE_CLOWN | 12 | Comic performer; crowd favorite but low prestige among peers |
| ROLE_ANIMAL_HANDLER | 13 | Trains and manages performing animals |
| ROLE_STRONGMAN | 14 | Feats-of-strength performer |
| ROLE_FORTUNE_TELLER | 15 | Mysterious oracle; predictions drive subplot and unease |
| ROLE_FIRE_PERFORMER | 16 | Fire breather, fire eater, or fire dancer |
| ROLE_ROUSTABOUT | 17 | Laborer who sets up and tears down the circus; lowest status |
| ITEM_PROP | 20 | Stage prop used during an act (e.g., juggling pins, hoops) |
| ITEM_COSTUME | 21 | Performance attire; affects audience impression |
| ITEM_ANIMAL | 22 | Trained performing animal (e.g., horse, elephant, dove) |
| ITEM_EQUIPMENT | 23 | Rigging, trapeze bars, tightrope wire, safety nets |
| ITEM_FORTUNE_TOOL | 24 | Tarot cards, crystal ball, or other divination apparatus |
| LOC_BIG_TOP | 30 | Main performance tent; the heart of the circus |
| LOC_BACKSTAGE | 31 | Preparation area behind the curtain; site of rivalries and scheming |
| LOC_ANIMAL_PEN | 32 | Enclosure for performing animals |
| LOC_CARAVAN | 33 | Living quarters in traveling wagons |
| LOC_FORTUNE_TENT | 34 | The fortune teller's private tent; an eerie, liminal space |
| LOC_TOWN_SQUARE | 35 | Public area in the current town; site of parades and promotion |
| LOC_PRACTICE_GROUND | 36 | Open area for rehearsing acts and testing new stunts |
| SHOW_FLOP | 40 | Show was poorly received; revenue loss |
| SHOW_MEDIOCRE | 41 | Lukewarm audience response |
| SHOW_HIT | 42 | Strong crowd reaction; solid ticket sales |
| SHOW_SENSATION | 43 | Standing ovation; fame spreads to neighboring towns |

## Custom Functions

| Name | Arguments | Description |
|------|-----------|-------------|
| moveToNewLocation | (characterID: UID) | Relocates a character to a new location |
| moveCircus | (locationID: UID) | Packs up the circus and travels to a new town |
| assignSpotlight | (characterID: UID) | Gives a performer the coveted headline act slot |
| performAct | (characterID: UID) | Executes a character's act; outcome depends on showmanship, risk, and item condition |
| collectRevenue | (locationID: UID) | Tallies ticket sales based on crowd capacity, show quality, and fame |
| readFortune | (fortuneTellerID: UID, targetID: UID) | The fortune teller makes a prediction about another character |
