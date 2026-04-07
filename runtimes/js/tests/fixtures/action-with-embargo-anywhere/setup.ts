/**
 * Setup for the action-with-embargo-anywhere fixture.
 *
 * Creates a world with two locations and one character who can
 * move between them. The announce action has an anywhere + forever embargo.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_A_ID = "loc-plaza-a";
export const LOCATION_B_ID = "loc-plaza-b";
export const HERALD_ID = "cid-herald";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_A_ID, "Plaza A");
    addLocation(state, LOCATION_B_ID, "Plaza B");
    addCharacter(state, HERALD_ID, "Herald", LOCATION_A_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
