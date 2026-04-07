/**
 * Setup for the action-selector fixture.
 *
 * Creates a world with one location and one character.
 * The selector randomly picks between wave and nod.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-lobby";
export const ACTOR_ID = "cid-actor";

export function setup(formal = false): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Lobby");
    addCharacter(state, ACTOR_ID, "Actor", LOCATION_ID, { formal });
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
