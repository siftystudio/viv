/**
 * Setup for the action-with-all-participation-modes fixture.
 *
 * Creates five characters at the same location: one for each participation
 * mode (initiator, partner, recipient, bystander) plus one uncast bystander
 * who should NOT receive a memory.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-hall";
export const OFFICIANT_ID = "cid-officiant";
export const ASSISTANT_ID = "cid-assistant";
export const HONOREE_ID = "cid-honoree";
export const WITNESS_ID = "cid-witness";
export const UNCAST_ID = "cid-uncast";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Hall");
    addCharacter(state, OFFICIANT_ID, "Officiant", LOCATION_ID);
    addCharacter(state, ASSISTANT_ID, "Assistant", LOCATION_ID);
    addCharacter(state, HONOREE_ID, "Honoree", LOCATION_ID);
    addCharacter(state, WITNESS_ID, "Witness", LOCATION_ID);
    addCharacter(state, UNCAST_ID, "Uncast", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
