/**
 * Setup for the action-with-items fixture.
 *
 * Creates a world with one location, two characters, and one item.
 * Tests item role casting with write-note and read-note actions.
 */

import type { SetupResult } from "../utils";
import { addCharacter, addItem, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-study";
export const WRITER_ID = "cid-writer";
export const READER_ID = "cid-reader";
export const NOTE_ID = "iid-note";

export function setup(): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Study");
    addCharacter(state, WRITER_ID, "Writer", LOCATION_ID);
    addCharacter(state, READER_ID, "Reader", LOCATION_ID);
    addItem(state, NOTE_ID, "Note", LOCATION_ID);
    const adapter = createTestAdapter(state);
    return { state, adapter };
}
