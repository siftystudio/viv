/**
 * Setup for the saliences-per-role fixture.
 *
 * Creates two characters at the same location. The Viv source defines an action
 * whose salience block assigns different salience values depending on the role
 * each character occupies.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

/**
 * The sole location in this fixture.
 */
export const LOCATION_ID = "loc-office";

/**
 * The character filling the proposer role.
 */
export const PROPOSER_ID = "cid-proposer";

/**
 * The character filling the responder role.
 */
export const RESPONDER_ID = "cid-responder";

/**
 * Returns a fresh test state and adapter for the saliences-per-role fixture.
 *
 * @returns An object containing the test state and a compatible adapter.
 */
export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Office");
    addCharacter(state, PROPOSER_ID, "Proposer", LOCATION_ID);
    addCharacter(state, RESPONDER_ID, "Responder", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
