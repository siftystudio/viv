/**
 * Setup for the debugging-watchlist fixture.
 *
 * Creates a world with one location, an initiator, and two candidates — neither
 * of whom is eligible. This guarantees that the action always fails targeting,
 * making all debugging counts deterministic regardless of candidate order.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-barracks";
export const CAPTAIN_ID = "cid-captain";
export const CANDIDATE_A_ID = "cid-candidate-a";
export const CANDIDATE_B_ID = "cid-candidate-b";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Barracks");
    addCharacter(state, CAPTAIN_ID, "Captain", LOCATION_ID);
    addCharacter(state, CANDIDATE_A_ID, "Candidate A", LOCATION_ID, { eligible: false });
    addCharacter(state, CANDIDATE_B_ID, "Candidate B", LOCATION_ID, { eligible: false });
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
