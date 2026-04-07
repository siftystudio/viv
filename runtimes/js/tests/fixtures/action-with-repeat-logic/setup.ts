/**
 * Setup for the action-with-repeat-logic fixture.
 *
 * Creates two characters at the same location. The Viv source defines a provoke
 * action whose reaction queues a reserved retaliate action with repeat logic
 * (unconditional, max 2 repeats).
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-alley";
export const PROVOKER_ID = "cid-provoker";
export const TARGET_ID = "cid-target";

/**
 * Returns a fresh test state and adapter for the action-with-repeat-logic fixture.
 *
 * @returns An object containing the test state and a compatible adapter.
 */
export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Alley");
    addCharacter(state, PROVOKER_ID, "Provoker", LOCATION_ID);
    addCharacter(state, TARGET_ID, "Target", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
