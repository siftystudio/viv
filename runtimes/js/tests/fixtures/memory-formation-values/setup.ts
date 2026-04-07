/**
 * Setup for the memory-formation-values fixture.
 *
 * Creates four characters at the same location, one for each participation
 * mode (initiator, partner, recipient, bystander). The compiled action has
 * explicit salience (7.0) and associations ("memorable") so that tests can
 * assert exact memory values.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-hall";
export const OFFICIANT_ID = "cid-officiant";
export const ASSISTANT_ID = "cid-assistant";
export const HONOREE_ID = "cid-honoree";
export const WITNESS_ID = "cid-witness";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Hall");
    addCharacter(state, OFFICIANT_ID, "Officiant", LOCATION_ID);
    addCharacter(state, ASSISTANT_ID, "Assistant", LOCATION_ID);
    addCharacter(state, HONOREE_ID, "Honoree", LOCATION_ID);
    addCharacter(state, WITNESS_ID, "Witness", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
