/**
 * Setup for the plan-with-wait fixture.
 *
 * Creates a world with one location and one character. The plan has a wait
 * instruction that blocks execution until the deadline elapses.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-ward";
export const PATIENT_ID = "cid-patient";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Ward");
    addCharacter(state, PATIENT_ID, "Patient", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
