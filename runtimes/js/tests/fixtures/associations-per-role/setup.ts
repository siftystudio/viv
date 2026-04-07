/**
 * Setup for the associations-per-role fixture.
 *
 * Creates two characters at the same location. The Viv source defines an action
 * whose association block assigns different associations depending on the role
 * each character occupies.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

/**
 * The sole location in this fixture.
 */
export const LOCATION_ID = "loc-market";

/**
 * The character filling the seller role.
 */
export const SELLER_ID = "cid-seller";

/**
 * The character filling the buyer role.
 */
export const BUYER_ID = "cid-buyer";

/**
 * Returns a fresh test state and adapter for the associations-per-role fixture.
 *
 * @returns An object containing the test state and a compatible adapter.
 */
export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Market");
    addCharacter(state, SELLER_ID, "Seller", LOCATION_ID);
    addCharacter(state, BUYER_ID, "Buyer", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
