# Auction House Schema

## Overview

A high-stakes auction house where dealers, collectors, forgers, and appraisers compete for rare artifacts. The simulation foregrounds provenance disputes, bidding alliances, authentication crises, and the social dynamics of old money versus new money. Narrative tension arises from the gap between an object's claimed history and its true origin, the formation and collapse of bidding cartels, and the reputational consequences of being associated with a forgery.

## Character Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Character's display name |
| role | enum | Professional function (e.g., `#ROLE_DEALER`, `#ROLE_COLLECTOR`, `#ROLE_APPRAISER`) |
| wealth | number | Liquid funds available for bidding and bribes |
| reputation | number | Standing in the art world; high values grant access to private sales and expert opinions |
| expertise | number | Ability to detect forgeries and assess true value; higher is sharper |
| nerve | number | Composure under pressure; governs bluffing, bidding wars, and confrontations |
| discretion | number | Tendency to keep secrets; low values make the character a gossip liability |
| oldMoney | boolean | Whether the character comes from established wealth; affects social dynamics |
| suspicious | boolean | Whether the character is currently under scrutiny for fraud or forgery |
| patron | UID | A wealthier character who bankrolls or sponsors this person |
| allies | UID[] | Characters with whom this person has a bidding alliance or information-sharing pact |
| rivals | UID[] | Characters this person is actively competing against or feuding with |
| covets | UID[] | Items this character is determined to acquire |

## Item Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Item's display name |
| category | enum | Kind of lot (e.g., `#LOT_PAINTING`, `#LOT_SCULPTURE`, `#LOT_ANTIQUITY`) |
| estimatedValue | number | Auction house's published estimate in thousands |
| reservePrice | number | Minimum acceptable bid; below this the lot is withdrawn |
| condition | number | Physical state; high values indicate excellent preservation |
| provenanceStrength | number | How well-documented the chain of ownership is; low values invite challenges |
| forged | boolean | Whether the item is actually a forgery (unknown to most characters) |
| owner | UID | Character currently in legal possession |
| claimants | UID[] | Characters who assert a competing ownership or provenance claim |

## Location Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Location's display name |
| category | enum | Type of space (e.g., `#LOC_SHOWROOM`, `#LOC_VAULT`, `#LOC_PRIVATE_VIEWING`) |
| privacy | number | How secluded the space is; high values enable covert dealings |
| security | number | Level of surveillance and access control |
| occupants | UID[] | Characters currently present |
| storedLots | UID[] | Items housed or displayed at this location |
| connectedTo | UID[] | Adjacent or accessible locations |

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
| ROLE_DEALER | 10 | Buys and resells art for profit; maintains a network of clients |
| ROLE_COLLECTOR | 11 | Acquires pieces for a private collection; motivated by taste or status |
| ROLE_APPRAISER | 12 | Authenticates and values lots; reputation depends on accuracy |
| ROLE_FORGER | 13 | Creates convincing fakes; operates in secrecy |
| ROLE_AUCTIONEER | 14 | Conducts sales from the podium; controls the pace and drama of bidding |
| ROLE_CURATOR | 15 | Manages the house's catalog and exhibition schedule |
| ROLE_RESTORER | 16 | Repairs and conserves damaged pieces; has intimate knowledge of materials |
| ROLE_SECURITY | 17 | Guards the vault and monitors the premises |
| ROLE_PATRON | 18 | Wealthy backer who finances others' acquisitions for a share of the profit |
| LOT_PAINTING | 20 | Oil, watercolor, or mixed-media work on canvas or panel |
| LOT_SCULPTURE | 21 | Three-dimensional work in stone, metal, or wood |
| LOT_ANTIQUITY | 22 | Archaeological artifact or ancient relic |
| LOT_JEWELRY | 23 | Precious stones, metalwork, or ornamental pieces |
| LOT_MANUSCRIPT | 24 | Rare book, letter, or illuminated text |
| LOT_FURNITURE | 25 | Period furniture or decorative art object |
| LOC_SHOWROOM | 30 | Main exhibition floor where lots are displayed before sale |
| LOC_AUCTION_FLOOR | 31 | The room where live bidding takes place |
| LOC_VAULT | 32 | High-security storage for the most valuable lots |
| LOC_RESTORATION_ROOM | 33 | Workshop for conservation, cleaning, and repair |
| LOC_PRIVATE_VIEWING | 34 | By-appointment room for inspecting lots away from public eyes |
| LOC_LOADING_DOCK | 35 | Receiving and dispatch area; lots arrive and depart here |
| LOC_OFFICE | 36 | Administrative offices for the auction house staff |
| LOC_LOUNGE | 37 | Social space where collectors, dealers, and staff mingle between sessions |
| PROVENANCE_PRISTINE | 40 | Unbroken chain of documented ownership |
| PROVENANCE_SOLID | 41 | Minor gaps but broadly accepted |
| PROVENANCE_QUESTIONABLE | 42 | Significant gaps or conflicting records |
| PROVENANCE_DUBIOUS | 43 | Widely suspected of being fabricated or laundered |

## Custom Functions

| Name | Arguments | Description |
|------|-----------|-------------|
| moveToNewLocation | (characterID: UID) | Relocates a character to a new location |
| placeBid | (bidderID: UID, lotID: UID, amount: number) | Submits a bid on a lot during an auction session |
| authenticateLot | (appraiserID: UID, lotID: UID) | Runs an expert evaluation; expertise and the lot's forgery status determine the outcome |
| challengeProvenance | (challengerID: UID, lotID: UID) | Publicly disputes the ownership history of a lot, potentially halting its sale |
| formBiddingAlliance | (leaderID: UID, memberIDs: UID[]) | Establishes a pact to suppress competitive bidding and share acquisitions |
| withdrawLot | (staffID: UID, lotID: UID) | Pulls a lot from the upcoming sale, typically after an authentication dispute |
| smuggleLot | (characterID: UID, lotID: UID, locationID: UID) | Covertly moves an item to a location, bypassing security and documentation |
