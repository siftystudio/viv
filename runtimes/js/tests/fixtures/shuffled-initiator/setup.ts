/**
 * Setup for the shuffled-initiator fixture.
 *
 * Creates a world with one location and two characters. Only one is willing,
 * so only one can initiate the action. When attemptAction is called without
 * an initiatorID, the runtime must find the willing character by iterating
 * through a shuffled pool.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-plaza";
export const WILLING_ID = "cid-willing";
export const UNWILLING_ID = "cid-unwilling";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Plaza");
    addCharacter(state, WILLING_ID, "Willing", LOCATION_ID, { willing: true });
    addCharacter(state, UNWILLING_ID, "Unwilling", LOCATION_ID, { willing: false });
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
