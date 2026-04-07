/**
 * Setup for the action-with-trope fixture.
 *
 * Creates a world with a teller, a friend, and a stranger. The teller's
 * friends list determines whether the trope-fit condition holds.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-parlor";
export const TELLER_ID = "cid-teller";
export const FRIEND_ID = "cid-friend";
export const STRANGER_ID = "cid-stranger";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Parlor");
    addCharacter(state, TELLER_ID, "Teller", LOCATION_ID, { friends: [FRIEND_ID] });
    addCharacter(state, FRIEND_ID, "Friend", LOCATION_ID);
    addCharacter(state, STRANGER_ID, "Stranger", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
