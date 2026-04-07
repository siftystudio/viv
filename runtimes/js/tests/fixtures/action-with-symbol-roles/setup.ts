/**
 * Setup for the action-with-symbol-roles fixture.
 *
 * Creates a world with one character. The reserved action's symbol role
 * is provided via precast bindings in attemptAction.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-office";
export const ACTOR_ID = "cid-actor";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Office");
    addCharacter(state, ACTOR_ID, "Actor", LOCATION_ID, { label: "" });
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
