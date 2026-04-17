/**
 * Setup for the reaction-with-hearer fixture.
 *
 * Creates a world with three characters: a greeter, another, and a listener.
 * The greeter greets the other; later, the greeter gossips to the listener
 * about the greet, which relays knowledge and triggers post-hoc dispatch of
 * the greet's hearer-referencing effect and reaction.
 */

import type { SetupResult } from "../utils";
import type { CustomFunction } from "../../../src";
import { addCharacter, addLocation, createTestAdapter, createTestState } from "../utils";

export const LOCATION_ID = "loc-square";
export const GREETER_ID = "cid-greeter";
export const OTHER_ID = "cid-other";
export const LISTENER_ID = "cid-listener";

/**
 * Records of which characters the `greet` action's custom functions fired for.
 */
export interface HearerMarks {
    /** Characters passed to `~recordHearer(@hearer)` in the effect. */
    readonly hearers: string[];
    /** Characters passed to `~recordGreeter(@greeter)` in the effect. */
    readonly greeters: string[];
}

/**
 * Returns the setup-result shape for this fixture, extended with a `marks` handle for
 * inspecting which characters the hearer- and greeter-referencing effects fired for.
 */
export interface HearerSetupResult extends SetupResult {
    readonly marks: HearerMarks;
}

/**
 * Builds the world and adapter for the reaction-with-hearer fixture.
 *
 * @returns The standard setup result, augmented with a `marks` handle whose `hearers` and
 *     `greeters` arrays are appended to whenever the corresponding custom function fires.
 */
export function setup(): HearerSetupResult {
    const state = createTestState();
    addLocation(state, LOCATION_ID, "Square");
    addCharacter(state, GREETER_ID, "Greeter", LOCATION_ID);
    addCharacter(state, OTHER_ID, "Other", LOCATION_ID);
    addCharacter(state, LISTENER_ID, "Listener", LOCATION_ID);
    const marks: HearerMarks = { hearers: [], greeters: [] };
    const recordHearer: CustomFunction = (...args: unknown[]) => {
        marks.hearers.push(args[0] as string);
    };
    const recordGreeter: CustomFunction = (...args: unknown[]) => {
        marks.greeters.push(args[0] as string);
    };
    const functions = { recordHearer, recordGreeter };
    const adapter = createTestAdapter(state, {}, functions);
    return { state, adapter, marks };
}
