/**
 * Setup for the action-with-conditions fixture.
 *
 * Creates two characters at the same location. The Viv source requires that the
 * listener is in the speaker's friends list and the speaker's mood is positive.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-cafe";
export const SPEAKER_ID = "cid-speaker";
export const LISTENER_ID = "cid-listener";

/**
 * Returns a fresh test state and adapter for the action-with-conditions fixture.
 *
 * The speaker has the listener in their friends list, and a positive mood,
 * so the conditions are satisfied by default.
 *
 * @returns An object containing the test state and a compatible adapter.
 */
export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Cafe");
    addCharacter(state, SPEAKER_ID, "Speaker", LOCATION_ID, { friends: [LISTENER_ID], mood: 10 });
    addCharacter(state, LISTENER_ID, "Listener", LOCATION_ID, { friends: [], mood: 5 });
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
