/**
 * Setup for the plan-with-reaction-window fixture.
 *
 * Creates a world with one location and one character. The plan has a reaction
 * window that queues two actions and waits for both to complete.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-hq";
export const OPERATOR_ID = "cid-operator";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "HQ");
    addCharacter(state, OPERATOR_ID, "Operator", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
