/**
 * Setup for the knowledge-relay fixture.
 *
 * Creates a world with one location and three characters. The fool acts a fool
 * in front of the gossiper, and then the gossiper tells the listener about it.
 * The listener was not present for the original action and learns about it
 * through relay.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-tavern";
export const FOOL_ID = "cid-fool";
export const GOSSIPER_ID = "cid-gossiper";
export const LISTENER_ID = "cid-listener";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Tavern");
    addCharacter(state, FOOL_ID, "Fool", LOCATION_ID);
    addCharacter(state, GOSSIPER_ID, "Gossiper", LOCATION_ID);
    addCharacter(state, LISTENER_ID, "Listener", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
