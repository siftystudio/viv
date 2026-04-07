# Detective Agency Schema

## Overview

A noir-flavored detective agency where hard-boiled investigators take cases, gather evidence, interview suspects, and build competing theories to crack the truth. The simulation tracks case management — evidence provenance and reliability, suspect rankings, witness credibility — alongside investigator state such as intuition, reputation, and fatigue. Narrative tension arises from unreliable witnesses, planted evidence, false leads, and the pressure of choosing between competing theories before confronting a suspect.

## Character Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Character's display name |
| role | enum | Function in the investigation (e.g., `#ROLE_DETECTIVE`, `#ROLE_SUSPECT`) |
| intuition | number | Gut-sense acuity; high values unlock hidden dialogue and deduction options |
| reputation | number | Standing with the public, police, and underworld; affects cooperation |
| fatigue | number | Accumulated exhaustion; high values impair judgment and social checks |
| caseload | number | Number of active cases; higher values spread attention thin |
| contacts | UID[] | Informants, allies, and professional connections |
| grudgeWith | UID | A character this person has a bitter personal history with |

## Item Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Item's display name |
| category | enum | Kind of evidence or item (e.g., `#ITEM_PHYSICAL`, `#ITEM_DOCUMENT`) |
| reliability | number | Trustworthiness of the evidence; low values suggest tampering or hearsay |
| significance | number | How strongly this item connects to the case theory |
| source | UID | Character or location that produced or yielded this item |
| planted | boolean | Whether the item was fabricated or placed to mislead |
| chainOfCustody | UID[] | Ordered list of characters who have handled this item |

## Location Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Location's display name |
| category | enum | Type of location (e.g., `#LOC_CRIME_SCENE`, `#LOC_PRECINCT`) |
| suspicion | number | How closely authorities or criminals are watching this place |
| secured | boolean | Whether the location is locked down or access-restricted |
| canvassed | boolean | Whether investigators have already swept this location |
| occupants | UID[] | Characters currently present |
| connectedTo | UID[] | Adjacent or reachable locations |
| evidence | UID[] | Evidence items found or stashed at this location |

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
| ROLE_DETECTIVE | 10 | Lead investigator working the case |
| ROLE_PARTNER | 11 | Supporting investigator; backup and second opinion |
| ROLE_SUSPECT | 12 | Person of interest in an active case |
| ROLE_WITNESS | 13 | Someone who observed relevant events |
| ROLE_INFORMANT | 14 | Underworld contact who trades secrets for favors |
| ROLE_CLIENT | 15 | Person who hired the agency |
| ITEM_PHYSICAL | 20 | Tangible evidence — fingerprint, weapon, fiber sample |
| ITEM_DOCUMENT | 21 | Written record — letter, ledger, photograph, contract |
| ITEM_TESTIMONY | 22 | Recorded statement from a witness or suspect |
| ITEM_FORENSIC | 23 | Lab result — toxicology, ballistics, DNA match |
| ITEM_CONTRABAND | 24 | Illicit goods that implicate their possessor |
| ITEM_PERSONAL | 25 | Belonging with sentimental or identifying value — wallet, locket |
| LOC_CRIME_SCENE | 30 | Primary location where the incident occurred |
| LOC_PRECINCT | 31 | Police station — interrogation rooms, records, holding cells |
| LOC_AGENCY | 32 | The detective agency's office |
| LOC_HAUNT | 33 | Bar, alley, or backroom frequented by informants |
| LOC_RESIDENCE | 34 | Private home or apartment of a suspect or witness |
| LOC_PUBLIC | 35 | Open area — park, diner, street corner — for surveillance or meets |
| PHASE_CANVASS | 40 | Initial evidence sweep and scene documentation |
| PHASE_INTERVIEW | 41 | Questioning witnesses and persons of interest |
| PHASE_THEORY | 42 | Synthesizing evidence into competing explanations |
| PHASE_CONFRONTATION | 43 | Presenting findings to the prime suspect |

## Custom Functions

| Name | Arguments | Description |
|------|-----------|-------------|
| moveToNewLocation | (characterID: UID) | Relocates a character to a new location |
| canvassScene | (characterID: UID, locationID: UID) | Investigator sweeps a location, potentially revealing evidence items |
| interrogate | (detectiveID: UID, subjectID: UID) | Conducts a formal interview; outcome depends on intuition vs. subject's composure |
| buildTheory | (characterID: UID, evidenceIDs: UID[]) | Assembles selected evidence into a coherent theory, scoring plausibility |
| confrontSuspect | (detectiveID: UID, suspectID: UID, evidenceIDs: UID[]) | Presents evidence to a suspect, forcing a reaction — confession, alibi, or flight |
| rankSuspects | (characterIDs: UID[]) | Scores suspects by motive, opportunity, and means based on current evidence |
