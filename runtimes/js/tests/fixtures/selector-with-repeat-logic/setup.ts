/**
 * Setup for the selector-with-repeat-logic fixture.
 *
 * Creates one character at a location. The Viv source defines a trigger action
 * whose reaction queues an action selector with repeat logic (unconditional,
 * max 1 repeat). The selector picks from two greeting actions.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-lobby";
export const GREETER_ID = "cid-greeter";

/**
 * Returns a fresh test state and adapter for the selector-with-repeat-logic fixture.
 *
 * @returns An object containing the test state and a compatible adapter.
 */
export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Lobby");
    addCharacter(state, GREETER_ID, "Greeter", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
