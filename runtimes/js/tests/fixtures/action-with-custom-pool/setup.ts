/**
 * Setup for the action-with-custom-pool fixture.
 *
 * Creates a world with a speaker who has a friends list. Only characters
 * in the friends list are eligible for the listener role.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-cafe";
export const SPEAKER_ID = "cid-speaker";
export const FRIEND_ID = "cid-friend";
export const STRANGER_ID = "cid-stranger";

export function setup(friends: string[] = [FRIEND_ID]): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Cafe");
    addCharacter(state, SPEAKER_ID, "Speaker", LOCATION_ID, { friends });
    addCharacter(state, FRIEND_ID, "Friend", LOCATION_ID);
    addCharacter(state, STRANGER_ID, "Stranger", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
