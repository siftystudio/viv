/**
 * Setup for the action-with-template-strings fixture.
 *
 * Creates a world with two characters so the gloss and report
 * can interpolate entity labels.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-plaza";
export const GREETER_ID = "cid-greeter";
export const TARGET_ID = "cid-target";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Plaza");
    addCharacter(state, GREETER_ID, "Alice", LOCATION_ID);
    addCharacter(state, TARGET_ID, "Bob", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
