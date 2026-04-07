/**
 * Setup for the plan-with-repeat-logic fixture.
 *
 * Creates two characters at the same location. The Viv source defines a trigger
 * action whose reaction queues a plan with unconditional repeat logic (max 1 repeat).
 * The plan has a single phase that queues a reserved check-post action.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-outpost";
export const GUARD_ID = "cid-guard";
export const BYSTANDER_ID = "cid-bystander";

/**
 * Returns a fresh test state and adapter for the plan-with-repeat-logic fixture.
 *
 * @returns An object containing the test state and a compatible adapter.
 */
export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Outpost");
    addCharacter(state, GUARD_ID, "Guard", LOCATION_ID);
    addCharacter(state, BYSTANDER_ID, "Bystander", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
