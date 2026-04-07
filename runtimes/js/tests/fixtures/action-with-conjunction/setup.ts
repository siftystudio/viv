/**
 * Setup for the action-with-conjunction fixture.
 *
 * Creates a character with items (array) and score (number) properties.
 * The condition is: @actor.items && @actor.score > 0
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-gate";
export const ACTOR_ID = "cid-actor";

export function setup(items: unknown[] = [], score = 5): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Gate");
    addCharacter(state, ACTOR_ID, "Actor", LOCATION_ID, { items, score });
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
