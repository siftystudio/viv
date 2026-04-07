/**
 * Setup for the action-with-chance fixture.
 *
 * Creates a world with one location and one character.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-casino";
export const ACTOR_ID = "cid-actor";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Casino");
    addCharacter(state, ACTOR_ID, "Actor", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
