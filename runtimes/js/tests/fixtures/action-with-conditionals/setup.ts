/**
 * Setup for the action-with-conditionals fixture.
 *
 * Creates a world with a judge and a subject whose score determines
 * which branch of the if/elif/else fires.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-school";
export const JUDGE_ID = "cid-judge";
export const SUBJECT_ID = "cid-subject";

export function setup(subjectScore: number): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "School");
    addCharacter(state, JUDGE_ID, "Judge", LOCATION_ID);
    addCharacter(state, SUBJECT_ID, "Subject", LOCATION_ID, {
        score: subjectScore,
        grade: "",
    });
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
