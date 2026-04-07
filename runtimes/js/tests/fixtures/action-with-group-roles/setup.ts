/**
 * Setup for the action-with-group-roles fixture.
 *
 * Creates a world with a leader and a configurable number of potential
 * crowd members. The group role requires 2-3 partners.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-square";
export const LEADER_ID = "cid-leader";
export const MEMBER_A_ID = "cid-member-a";
export const MEMBER_B_ID = "cid-member-b";
export const MEMBER_C_ID = "cid-member-c";

export function setup(memberCount = 3): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Town Square");
    addCharacter(state, LEADER_ID, "Leader", LOCATION_ID);
    if (memberCount >= 1) addCharacter(state, MEMBER_A_ID, "Member A", LOCATION_ID);
    if (memberCount >= 2) addCharacter(state, MEMBER_B_ID, "Member B", LOCATION_ID);
    if (memberCount >= 3) addCharacter(state, MEMBER_C_ID, "Member C", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
