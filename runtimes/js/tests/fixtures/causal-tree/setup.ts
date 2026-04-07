/**
 * Setup for the causal-tree fixture.
 *
 * Creates a world with one location and one character — enough to force
 * arbitrary causal topologies via {@link attemptAction} with explicit causes.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

/**
 * The sole location in this fixture.
 */
export const LOCATION_ID = "loc-town";

/**
 * The sole character in this fixture, who will serve as initiator for all actions.
 */
export const CHARACTER_ID = "cid-alice";

/**
 * Returns a fresh test state and adapter for the causal-tree fixture.
 *
 * @returns An object containing the test state and a compatible adapter.
 */
export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Town Square");
    addCharacter(state, CHARACTER_ID, "Alice", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
