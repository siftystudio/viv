/**
 * Setup for the action-with-embargo-time fixture.
 *
 * Creates a world with two characters. The chat action has a
 * 30-minute time-limited embargo.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-cafe";
export const SPEAKER_ID = "cid-speaker";
export const LISTENER_ID = "cid-listener";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Cafe");
    addCharacter(state, SPEAKER_ID, "Speaker", LOCATION_ID);
    addCharacter(state, LISTENER_ID, "Listener", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
