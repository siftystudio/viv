/**
 * Setup for the action-with-arithmetic fixture.
 *
 * Creates a world with one character whose a and b properties
 * are used in arithmetic expressions.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-calc";
export const ACTOR_ID = "cid-actor";

export function setup(a = 10, b = 3): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Calculator");
    addCharacter(state, ACTOR_ID, "Actor", LOCATION_ID, {
        a, b, sum: 0, diff: 0, prod: 0, quot: 0,
    });
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
