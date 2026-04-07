/**
 * Setup for the action-with-append-list fixture.
 *
 * Creates a character with an inventory array and a loot array.
 * Tests whether appending an array flattens or nests.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-dungeon";
export const ACTOR_ID = "cid-actor";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Dungeon");
    addCharacter(state, ACTOR_ID, "Actor", LOCATION_ID, {
        inventory: ["sword"],
        loot: ["shield", "potion"],
    });
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
