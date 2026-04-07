/**
 * Setup for the action-with-assignments fixture.
 *
 * Creates a world with one location and one character with properties
 * that will be modified by each assignment operator.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-arena";
export const ACTOR_ID = "cid-actor";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Arena");
    addCharacter(state, ACTOR_ID, "Actor", LOCATION_ID, {
        label: "original",
        score: 5,
        health: 100,
        tags: ["old-tag", "keep-tag"],
    });
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
