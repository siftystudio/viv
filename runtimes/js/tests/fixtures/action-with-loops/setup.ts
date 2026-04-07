/**
 * Setup for the action-with-loops fixture.
 *
 * Creates a world with one location and one character whose `values`
 * array is iterated to sum into `total`.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-camp";
export const COUNTER_ID = "cid-counter";

export function setup(values: number[] = [3, 7, 5]): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Camp");
    addCharacter(state, COUNTER_ID, "Counter", LOCATION_ID, {
        values,
        total: 0,
    });
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
