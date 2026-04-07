/**
 * Setup for the action-with-effects fixture.
 *
 * Creates two characters at the same location, each with a numeric `mood` property.
 * The Viv source mutates mood via compound assignment.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-park";
export const BULLY_ID = "cid-bully";
export const VICTIM_ID = "cid-victim";
export const INITIAL_MOOD = 50;

/**
 * Returns a fresh test state and adapter for the action-with-effects fixture.
 *
 * @returns An object containing the test state and a compatible adapter.
 */
export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Park");
    addCharacter(state, BULLY_ID, "Bully", LOCATION_ID, { mood: INITIAL_MOOD });
    addCharacter(state, VICTIM_ID, "Victim", LOCATION_ID, { mood: INITIAL_MOOD });
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
