/**
 * Setup for the action-with-saliences fixture.
 *
 * Creates two characters at the same location. The Viv source defines an action
 * that tags memories with a "notable" association and a salience of 5.0.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

/**
 * The sole location in this fixture.
 */
export const LOCATION_ID = "loc-plaza";

/**
 * The observing character who will serve as initiator.
 */
export const OBSERVER_ID = "cid-observer";

/**
 * The observed character who will serve as recipient.
 */
export const SUBJECT_ID = "cid-subject";

/**
 * Returns a fresh test state and adapter for the action-with-saliences fixture.
 *
 * @returns An object containing the test state and a compatible adapter.
 */
export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Plaza");
    addCharacter(state, OBSERVER_ID, "Observer", LOCATION_ID);
    addCharacter(state, SUBJECT_ID, "Subject", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
