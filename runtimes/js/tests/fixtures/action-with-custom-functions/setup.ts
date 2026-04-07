/**
 * Setup for the action-with-custom-functions fixture.
 *
 * Creates a world with one location and one character. The adapter
 * registers a custom function that mutates entity state.
 */

import type { SetupResult } from "../utils";
import type { CustomFunction } from "../../../src";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-lab";
export const ACTOR_ID = "cid-actor";

export function setup(
    functionImpl?: CustomFunction,
): SetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Laboratory");
    addCharacter(state, ACTOR_ID, "Actor", LOCATION_ID, { transformed: false });
    const defaultImpl: CustomFunction = (...args: unknown[]) => {
        // Default: mark the actor as transformed
        const entityID = args[0] as string;
        const entity = state.entities[entityID] as any;
        if (entity) {
            entity.transformed = true;
        }
    };
    const functions = { applyEffect: functionImpl ?? defaultImpl };
    const adapter = createTestAdapter(state, {}, functions);
    return { state, adapter };
}
