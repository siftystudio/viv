/**
 * Setup for the reaction-with-urgency fixture.
 *
 * Creates two characters at the same location. The Viv source defines an action
 * whose reaction specifies an urgency value that controls scheduling priority
 * of the queued follow-up action.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

/**
 * The sole location in this fixture.
 */
export const LOCATION_ID = "loc-alley";

/**
 * The character filling the aggressor role.
 */
export const AGGRESSOR_ID = "cid-aggressor";

/**
 * The character filling the target role.
 */
export const TARGET_ID = "cid-target";

/**
 * Returns a fresh test state and adapter for the reaction-with-urgency fixture.
 *
 * @returns An object containing the test state and a compatible adapter.
 */
export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Alley");
    addCharacter(state, AGGRESSOR_ID, "Aggressor", LOCATION_ID);
    addCharacter(state, TARGET_ID, "Target", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
