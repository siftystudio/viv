/**
 * Setup for the bad-pool-directive fixture.
 *
 * Creates a world where the leader's `team` property is set to a non-array
 * value, which will cause the pool directive to fail during role casting.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-office";
export const LEADER_ID = "cid-leader";
export const HELPER_ID = "cid-helper";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Office");
    // Set team to a string instead of an array — this will cause the pool
    // directive `from: @leader.team` to fail with VivRoleCastingError
    addCharacter(state, LEADER_ID, "Leader", LOCATION_ID, { team: "not-an-array" });
    addCharacter(state, HELPER_ID, "Helper", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
