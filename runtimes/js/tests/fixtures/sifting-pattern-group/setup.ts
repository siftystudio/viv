/**
 * Setup for the sifting-pattern-group fixture.
 *
 * Creates two characters at the same location. The Viv source defines a sifting
 * pattern with group action roles and a shared action role in `roles:`, testing
 * that the same action can appear in multiple action roles and in a `roles:`
 * role simultaneously.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

/**
 * The sole location in this fixture.
 */
export const LOCATION_ID = "loc-hall";

/**
 * The character whose memories will be sifted.
 */
export const PROTAGONIST_ID = "cid-protagonist";

/**
 * A secondary character to fill recipient roles.
 */
export const OTHER_ID = "cid-other";

/**
 * Returns a fresh test state and adapter for the sifting-pattern-group fixture.
 *
 * @returns An object containing the test state and a compatible adapter.
 */
export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Hall");
    addCharacter(state, PROTAGONIST_ID, "Protagonist", LOCATION_ID);
    addCharacter(state, OTHER_ID, "Other", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
