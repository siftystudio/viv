# Submarine Crew Schema

## Overview

A military submarine on extended underwater patrol, where confined spaces, rigid hierarchy, and invisible threats compress every interpersonal friction into a pressure cooker. The simulation tracks chain-of-command authority alongside fatigue, discipline, and the quiet erosion of sanity that comes from weeks submerged without sunlight. Narrative tension arises from sonar contacts that may be hostile, torpedo decisions with irreversible consequences, mechanical failures that threaten the boat, oxygen rationing, and the competing loyalties crew members feel toward duty, their commanding officer, and their own survival.

## Character Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Character's display name |
| rank | enum | Position in the boat's chain of command (e.g., `#RANK_CAPTAIN`, `#RANK_SEAMAN`) |
| department | enum | Operational specialty (e.g., `#DEPT_WEAPONS`, `#DEPT_ENGINEERING`) |
| discipline | number | Adherence to orders and protocol; low values signal insubordination risk |
| fatigue | number | Accumulated exhaustion from watch rotations and emergencies; high values impair performance |
| stress | number | Psychological strain from confinement, danger, and uncertainty |
| morale | number | Willingness to endure hardship and cooperate with the crew |
| competence | number | Technical skill and reliability under pressure |
| loyaltyToCaptain | number | Personal trust in the commanding officer's judgment |
| selfPreservation | number | Willingness to prioritize personal survival over orders or mission |
| suspicion | number | Distrust of other crew members; feeds paranoia in close quarters |
| trustedBy | UID[] | Crew members who rely on or confide in this character |
| resents | UID[] | Crew members this character harbors grievance toward |
| superior | UID | The officer this person reports to in the chain of command |
| bunkmate | UID | Character who shares a berthing rack on opposite watch rotation |

## Item Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Item's display name |
| category | enum | Kind of item (e.g., `#ITEM_WEAPON`, `#ITEM_TOOL`, `#ITEM_SUPPLY`) |
| condition | number | Operational integrity; degrades with use, damage, or seawater exposure |
| critical | boolean | Whether the boat cannot safely operate without this item |
| assignedTo | UID | Character currently responsible for this item |
| installedIn | UID | Compartment where this item is mounted, stowed, or racked |

## Location Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Location's display name |
| category | enum | Type of compartment (e.g., `#COMP_CONTROL`, `#COMP_TORPEDO`, `#COMP_ENGINE`) |
| oxygenLevel | number | Breathable atmosphere quality; deteriorates over time without scrubbing |
| flooded | boolean | Whether the compartment has taken on water |
| occupants | UID[] | Characters currently present |
| connectedTo | UID[] | Adjacent compartments reachable through hatches |

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
| RANK_CAPTAIN | 10 | Commanding officer of the boat |
| RANK_XO | 11 | Executive officer; second-in-command |
| RANK_CHIEF | 12 | Chief of the Boat or department chief; senior enlisted authority |
| RANK_OFFICER | 13 | Commissioned officer — department head or watch officer |
| RANK_PETTY_OFFICER | 14 | Non-commissioned officer; leads a watch section or team |
| RANK_SEAMAN | 15 | Junior enlisted crew member |
| DEPT_COMMAND | 20 | Bridge watch, navigation, and tactical decision-making |
| DEPT_WEAPONS | 21 | Torpedo handling, fire control, and sonar operation |
| DEPT_ENGINEERING | 22 | Reactor, propulsion, and hull integrity |
| DEPT_SUPPLY | 23 | Provisions, atmosphere control, and damage-control stores |
| DEPT_MEDICAL | 24 | Crew health, psychological fitness, and triage |
| ITEM_WEAPON | 30 | Torpedo, sidearm, or ordnance component |
| ITEM_TOOL | 31 | Wrench, multimeter, welding rig, or diagnostic gear |
| ITEM_SUPPLY | 32 | Oxygen canister, CO2 scrubber cartridge, food ration, water |
| ITEM_COMPONENT | 33 | Replacement part for a boat system |
| ITEM_DOCUMENT | 34 | Sealed orders, codebook, navigation chart, or signal log |
| COMP_CONTROL | 40 | Control room; helm, periscope, and command decisions |
| COMP_TORPEDO | 41 | Torpedo room; weapons loading and launch tubes |
| COMP_SONAR | 42 | Sonar shack; acoustic monitoring and contact classification |
| COMP_ENGINE | 43 | Engine room; reactor, turbines, and propulsion machinery |
| COMP_BERTHING | 44 | Crew quarters; hot-racking berths and personal stowage |
| COMP_GALLEY | 45 | Mess and galley; meals and off-duty congregation |
| COMP_MEDBAY | 46 | Sick bay; treatment space and medication stores |
| COMP_STORES | 47 | Supply hold; provisions, spare parts, and damage-control gear |
| DEPTH_PERISCOPE | 50 | Shallow enough to raise the periscope or snorkel |
| DEPTH_CRUISING | 51 | Standard patrol depth; quiet running |
| DEPTH_DEEP | 52 | Below thermal layer; harder to detect, higher hull stress |
| DEPTH_TEST | 53 | Near maximum rated depth; hull groans, extreme danger |
| CONTACT_UNKNOWN | 60 | Sonar return not yet classified |
| CONTACT_MERCHANT | 61 | Identified as civilian shipping |
| CONTACT_WARSHIP | 62 | Identified as hostile or potentially hostile surface combatant |
| CONTACT_SUBMARINE | 63 | Identified as another submarine |
| CONTACT_BIOLOGICAL | 64 | Marine life — whale, shrimp layer, or other false alarm |

## Custom Functions

| Name | Arguments | Description |
|------|-----------|-------------|
| moveToNewLocation | (characterID: UID) | Relocates a character to a new compartment |
| sealHatch | (locationID: UID) | Dogs the hatch on a compartment, isolating it from adjacent spaces |
| floodCompartment | (locationID: UID) | Simulates flooding in a compartment; occupants must evacuate or drown |
| blowBallast | () | Emergency surface; blows all ballast tanks to bring the boat up |
| changeDepth | (depth: enum) | Adjusts the boat's depth band, affecting detection risk and hull stress |
| launchTorpedo | (contactID: UID) | Fires a torpedo at a classified sonar contact |
| runSilent | () | Orders all-stop and rig for ultra-quiet; reduces detection but increases crew stress |
| scrubAtmosphere | (locationID: UID) | Runs CO2 scrubbers in a compartment, restoring oxygen level |
| relieveOfDuty | (commanderID: UID, targetID: UID) | A superior formally removes a subordinate from their post |
