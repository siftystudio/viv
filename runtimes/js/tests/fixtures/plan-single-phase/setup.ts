/**
 * Setup for the plan-single-phase fixture.
 *
 * Creates two characters at the same location. The Viv source defines a plan
 * that queues a reserved action with role bindings derived from plan roles.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

/**
 * The sole location in this fixture.
 */
export const LOCATION_ID = "loc-forest";

/**
 * The character who will execute the plan.
 */
export const PLOTTER_ID = "cid-plotter";

/**
 * The target character.
 */
export const TARGET_ID = "cid-target";

/**
 * Returns a fresh test state and adapter for the plan-single-phase fixture.
 *
 * @returns An object containing the test state and a compatible adapter.
 */
export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Forest");
    addCharacter(state, PLOTTER_ID, "Plotter", LOCATION_ID);
    addCharacter(state, TARGET_ID, "Target", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
