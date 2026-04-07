/**
 * Setup for the action-with-embargoes fixture.
 *
 * Creates two characters at the same location. The Viv source defines a permanent
 * location-based embargo on the chat action, so the second attempt at the same
 * location should fail.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-plaza";
export const SPEAKER_ID = "cid-speaker";
export const LISTENER_ID = "cid-listener";

/**
 * Returns a fresh test state and adapter for the action-with-embargoes fixture.
 *
 * @returns An object containing the test state and a compatible adapter.
 */
export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Plaza");
    addCharacter(state, SPEAKER_ID, "Speaker", LOCATION_ID);
    addCharacter(state, LISTENER_ID, "Listener", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
