/**
 * Setup for the action-with-scratch fixture.
 *
 * Creates a world with one character whose base property feeds into
 * a scratch variable computation.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-lab";
export const ACTOR_ID = "cid-actor";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Lab");
    addCharacter(state, ACTOR_ID, "Actor", LOCATION_ID, { base: 7, result: 0 });
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
