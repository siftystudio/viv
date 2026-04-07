/**
 * Setup for the query-by-action-name fixture.
 *
 * Creates two characters at the same location. The Viv source defines actions
 * with distinct names and a query that filters memories by the originating
 * action's name.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

/**
 * The sole location in this fixture.
 */
export const LOCATION_ID = "loc-park";

/**
 * The first character.
 */
export const CHAR_A_ID = "cid-a";

/**
 * The second character.
 */
export const CHAR_B_ID = "cid-b";

/**
 * Returns a fresh test state and adapter for the query-by-action-name fixture.
 *
 * @returns An object containing the test state and a compatible adapter.
 */
export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Park");
    addCharacter(state, CHAR_A_ID, "Alice", LOCATION_ID);
    addCharacter(state, CHAR_B_ID, "Bob", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
