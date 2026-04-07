/**
 * Setup for the action-with-truthiness fixture.
 *
 * Creates a world with one character whose items and metadata
 * properties test Viv's truthiness semantics.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-lab";
export const ACTOR_ID = "cid-actor";

export function setup(items: unknown[] = [], metadata: Record<string, unknown> = {}): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Lab");
    addCharacter(state, ACTOR_ID, "Actor", LOCATION_ID, { items, metadata });
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
