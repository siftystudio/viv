/**
 * Setup for the action-with-optional-roles fixture.
 *
 * Creates a world with one or two characters. When only the walker
 * is present, the optional companion role remains empty.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-trail";
export const WALKER_ID = "cid-walker";
export const COMPANION_ID = "cid-companion";

export function setup(includeCompanion = true): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Trail");
    addCharacter(state, WALKER_ID, "Walker", LOCATION_ID, { companioned: false });
    if (includeCompanion) {
        addCharacter(state, COMPANION_ID, "Companion", LOCATION_ID);
    }
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
