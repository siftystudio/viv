/**
 * Setup for the action-with-enums fixture.
 *
 * Creates a world with one location, a judge, and a subject whose score
 * property is checked against an enum threshold.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-court";
export const JUDGE_ID = "cid-judge";
export const SUBJECT_ID = "cid-subject";

const ENUMS = {
    IMPORTANCE_HIGH: 5,
    THRESHOLD: 3,
    RATING_GOOD: 10,
    SALIENCE_MEDIUM: 4,
};

export function setup(subjectScore = 5): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Courtroom");
    addCharacter(state, JUDGE_ID, "Judge", LOCATION_ID);
    addCharacter(state, SUBJECT_ID, "Subject", LOCATION_ID, { score: subjectScore, rating: 0 });
    const adapter = createTestAdapter(state, ENUMS);
    return { state, adapter };
}
