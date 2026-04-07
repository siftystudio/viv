/**
 * Setup for the action-with-knowledge-check fixture.
 *
 * Creates a world with two characters. The witness action creates a
 * memory; the reminisce action requires that the thinker knows a
 * specific past action.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-garden";
export const REMOTE_LOCATION_ID = "loc-tower";
export const OBSERVER_ID = "cid-observer";
export const SUBJECT_ID = "cid-subject";
export const OUTSIDER_ID = "cid-outsider";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Garden");
    addLocation(state, REMOTE_LOCATION_ID, "Tower");
    addCharacter(state, OBSERVER_ID, "Observer", LOCATION_ID);
    addCharacter(state, SUBJECT_ID, "Subject", LOCATION_ID);
    // Outsider is at a different location — will NOT be present during witness
    addCharacter(state, OUTSIDER_ID, "Outsider", REMOTE_LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
