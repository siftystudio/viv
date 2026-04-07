/**
 * Setup for the minimal-action fixture.
 *
 * Creates a world with one location and one character — the simplest scenario
 * in which an action can be selected and performed.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

/**
 * The sole location in this fixture.
 */
export const LOCATION_ID = "loc-town";

/**
 * The sole character in this fixture, who will serve as initiator.
 */
export const CHARACTER_ID = "cid-alice";

/**
 * Returns a fresh test state and adapter for the minimal-action fixture.
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
