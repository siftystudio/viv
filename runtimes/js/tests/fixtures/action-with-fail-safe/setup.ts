/**
 * Setup for the action-with-fail-safe fixture.
 *
 * Creates a world with two characters — one with a nested profile
 * object and one without, to test fail-safe chaining.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-office";
export const CHECKER_ID = "cid-checker";
export const TARGET_WITH_PROFILE_ID = "cid-has-profile";
export const TARGET_WITHOUT_PROFILE_ID = "cid-no-profile";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Office");
    addCharacter(state, CHECKER_ID, "Checker", LOCATION_ID);
    addCharacter(state, TARGET_WITH_PROFILE_ID, "HasProfile", LOCATION_ID, {
        profile: { active: true },
    });
    addCharacter(state, TARGET_WITHOUT_PROFILE_ID, "NoProfile", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
