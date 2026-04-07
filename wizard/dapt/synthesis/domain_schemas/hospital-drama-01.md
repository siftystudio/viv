# Hospital Drama Schema

## Overview

A busy urban hospital where doctors, nurses, residents, and administrators contend with medical crises, resource scarcity, and interpersonal friction. Narrative tension emerges from competing pressures — patient acuity demands immediate attention while budgets constrain available beds, equipment, and staff. Ethical dilemmas (triage priority, experimental protocols, whistleblowing) intersect with mentorship dynamics, burnout, and departmental politics to produce stories about people under sustained, high-stakes pressure.

## Character Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Character's display name |
| role | enum | Professional position (e.g., `#ROLE_ATTENDING`, `#ROLE_NURSE`, `#ROLE_RESIDENT`) |
| department | enum | Hospital department (e.g., `#DEPT_ER`, `#DEPT_SURGERY`, `#DEPT_ONCOLOGY`) |
| competence | number | Clinical skill and reliability; high values unlock complex procedures |
| burnout | number | Accumulated exhaustion; high values impair judgment and bedside manner |
| morale | number | Willingness to take on extra shifts, mentor juniors, and cooperate |
| reputation | number | Standing among peers and administration; affects assignments and authority |
| patients | UID[] | Patients currently under this character's care |
| mentor | UID | Senior colleague who guides or evaluates this character |

## Item Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Item's display name |
| category | enum | Kind of item (e.g., `#ITEM_EQUIPMENT`, `#ITEM_MEDICATION`, `#ITEM_CHART`) |
| supply | number | Remaining quantity or doses; zero means unavailable |
| restricted | boolean | Whether the item requires authorization to use |
| assignedTo | UID | Patient or staff member this item is currently allocated to |
| requestedBy | UID[] | Staff members who have submitted requests for this item |

## Location Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Location's display name |
| category | enum | Type of area (e.g., `#AREA_ER`, `#AREA_OR`, `#AREA_WARD`) |
| bedCount | number | Total patient beds in this area |
| bedsAvailable | number | Beds not currently occupied; zero triggers diversion or overflow |
| equipmentLevel | number | Quality and availability of medical equipment |
| sterile | boolean | Whether the area is currently in sterile protocol |
| occupants | UID[] | Characters currently present |
| connectedTo | UID[] | Adjacent or reachable hospital areas |

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
| ROLE_ATTENDING | 10 | Board-certified physician who leads a service |
| ROLE_RESIDENT | 11 | Physician-in-training under supervision |
| ROLE_INTERN | 12 | First-year resident; lowest medical authority |
| ROLE_NURSE | 13 | Registered nurse responsible for bedside care |
| ROLE_CHARGE_NURSE | 14 | Senior nurse overseeing shift staffing and workflow |
| ROLE_SURGEON | 15 | Specialist who performs operative procedures |
| ROLE_ADMIN | 16 | Hospital administrator managing budgets and policy |
| DEPT_ER | 20 | Emergency department; acute intake and stabilization |
| DEPT_SURGERY | 21 | Surgical services; operating rooms and post-op recovery |
| DEPT_ICU | 22 | Intensive care; highest-acuity patients requiring constant monitoring |
| DEPT_ONCOLOGY | 23 | Cancer treatment; chemotherapy, radiation, clinical trials |
| DEPT_PEDIATRICS | 24 | Care for children and adolescents |
| DEPT_ADMIN | 25 | Administrative offices; budgets, HR, compliance |
| ACUITY_STABLE | 30 | Patient is stable; routine monitoring sufficient |
| ACUITY_GUARDED | 31 | Patient requires close observation; condition may deteriorate |
| ACUITY_SERIOUS | 32 | Patient needs active intervention; deterioration is likely without it |
| ACUITY_CRITICAL | 33 | Patient's life is in immediate danger |
| ITEM_EQUIPMENT | 40 | Ventilator, defibrillator, imaging machine, or surgical instrument |
| ITEM_MEDICATION | 41 | Drug — standard formulary or experimental |
| ITEM_CHART | 42 | Patient medical record or diagnostic report |
| ITEM_BLOOD | 43 | Blood product for transfusion |
| ITEM_ORGAN | 44 | Donor organ awaiting transplant |
| AREA_ER | 50 | Emergency room; triage bays and trauma suites |
| AREA_OR | 51 | Operating room; sterile surgical environment |
| AREA_WARD | 52 | General inpatient ward; beds and nursing stations |
| AREA_ICU | 53 | Intensive care unit; ventilators and monitors |
| AREA_LAB | 54 | Pathology and diagnostics laboratory |
| AREA_LOUNGE | 55 | Staff break room; rest and private conversation |
| AREA_ADMIN | 56 | Administrative offices and conference rooms |
| SHIFT_DAY | 60 | Standard daytime shift |
| SHIFT_NIGHT | 61 | Overnight shift; reduced staffing, higher fatigue |
| SHIFT_ON_CALL | 62 | Off-site but available; called in for emergencies |

## Custom Functions

| Name | Arguments | Description |
|------|-----------|-------------|
| moveToNewLocation | (characterID: UID) | Relocates a character to a new hospital area |
| admitPatient | (patientID: UID, locationID: UID, caregiverID: UID) | Assigns a patient to a bed in a location under a caregiver's service |
| triagePatient | (patientID: UID, acuity: enum) | Sets a patient's acuity level, determining treatment priority |
| requestConsult | (requesterID: UID, consultantID: UID, patientID: UID) | Pages a specialist to evaluate a patient, creating a cross-department interaction |
| authorizeExperimental | (adminID: UID, itemID: UID, patientID: UID) | Grants administrative approval to use a restricted treatment on a patient |
| callCode | (locationID: UID) | Triggers an emergency response, summoning available staff to the location |
