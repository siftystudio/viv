/**
 * Setup for the query-by-association fixture.
 *
 * Creates two characters at the same location. The Viv source defines two actions
 * (observe and idle) that tag memories differently, plus a query that matches
 * memories with the "notable" association.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

/**
 * The sole location in this fixture.
 */
export const LOCATION_ID = "loc-market";

/**
 * The observing character.
 */
export const OBSERVER_ID = "cid-observer";

/**
 * The observed character.
 */
export const SUBJECT_ID = "cid-subject";

/**
 * Returns a fresh test state and adapter for the query-by-association fixture.
 *
 * @returns An object containing the test state and a compatible adapter.
 */
export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Market");
    addCharacter(state, OBSERVER_ID, "Observer", LOCATION_ID);
    addCharacter(state, SUBJECT_ID, "Subject", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
