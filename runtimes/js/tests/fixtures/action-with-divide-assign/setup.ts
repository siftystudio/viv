/**
 * Setup for the action-with-divide-assign fixture.
 *
 * Creates a character with numerator, divisor, health, and result properties.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-lab";
export const ACTOR_ID = "cid-actor";

export function setup(numerator = 100, divisor = 4): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Lab");
    addCharacter(state, ACTOR_ID, "Actor", LOCATION_ID, {
        numerator, divisor, health: 100, result: 0,
    });
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
