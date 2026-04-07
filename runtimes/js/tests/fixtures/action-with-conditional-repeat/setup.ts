/**
 * Setup for the action-with-conditional-repeat fixture.
 *
 * Creates two characters at the same location. The target character starts with
 * anger: 2. The Viv source defines a provoke action whose reaction queues a
 * reserved retaliate action with conditional repeat logic (repeats while
 * @target.anger > 0, max 5 repeats). The retaliate action decrements anger by 1.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-alley";
export const PROVOKER_ID = "cid-provoker";
export const TARGET_ID = "cid-target";

/**
 * Returns a fresh test state and adapter for the action-with-conditional-repeat fixture.
 *
 * @returns An object containing the test state and a compatible adapter.
 */
export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Alley");
    addCharacter(state, PROVOKER_ID, "Provoker", LOCATION_ID);
    addCharacter(state, TARGET_ID, "Target", LOCATION_ID, { anger: 2 });
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
