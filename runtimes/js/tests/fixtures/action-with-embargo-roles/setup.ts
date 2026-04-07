/**
 * Setup for the action-with-embargo-roles fixture.
 *
 * Creates a world with three characters. The duel action has a
 * role-scoped embargo on @challenger + @opponent.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-arena";
export const CHAR_A_ID = "cid-a";
export const CHAR_B_ID = "cid-b";
export const CHAR_C_ID = "cid-c";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Arena");
    addCharacter(state, CHAR_A_ID, "Character A", LOCATION_ID);
    addCharacter(state, CHAR_B_ID, "Character B", LOCATION_ID);
    addCharacter(state, CHAR_C_ID, "Character C", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
