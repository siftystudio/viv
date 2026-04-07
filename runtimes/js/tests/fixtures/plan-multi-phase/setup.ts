/**
 * Setup for the plan-multi-phase fixture.
 *
 * Creates a world with one location and one character.
 * The plan has two phases that each queue a reserved action.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-base";
export const AGENT_ID = "cid-agent";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Base");
    addCharacter(state, AGENT_ID, "Agent", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
