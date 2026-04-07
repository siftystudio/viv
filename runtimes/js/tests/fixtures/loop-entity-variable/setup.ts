/**
 * Setup for the loop-entity-variable fixture.
 *
 * Creates a leader whose followers array contains entity IDs of
 * other characters. The loop should iterate and update each follower's morale.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-camp";
export const LEADER_ID = "cid-leader";
export const FOLLOWER_A_ID = "cid-follower-a";
export const FOLLOWER_B_ID = "cid-follower-b";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Camp");
    addCharacter(state, FOLLOWER_A_ID, "Follower A", LOCATION_ID, { morale: 3 });
    addCharacter(state, FOLLOWER_B_ID, "Follower B", LOCATION_ID, { morale: 5 });
    addCharacter(state, LEADER_ID, "Leader", LOCATION_ID, {
        followers: [FOLLOWER_A_ID, FOLLOWER_B_ID],
    });
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
