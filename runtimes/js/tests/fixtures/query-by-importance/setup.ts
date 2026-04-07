/**
 * Setup for the query-by-importance fixture.
 *
 * Creates two characters at the same location. The Viv source defines actions
 * that produce memories with varying importance levels and a query that filters
 * by importance threshold.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

/**
 * The sole location in this fixture.
 */
export const LOCATION_ID = "loc-hall";

/**
 * The acting character who initiates actions.
 */
export const ACTOR_ID = "cid-actor";

/**
 * The witnessing character who observes actions.
 */
export const WITNESS_ID = "cid-witness";

/**
 * Returns a fresh test state and adapter for the query-by-importance fixture.
 *
 * @returns An object containing the test state and a compatible adapter.
 */
export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Hall");
    addCharacter(state, ACTOR_ID, "Actor", LOCATION_ID);
    addCharacter(state, WITNESS_ID, "Witness", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
