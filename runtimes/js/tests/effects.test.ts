/**
 * Tests for effect application and entity-data mutation.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { attemptAction, initializeVivRuntime } from "../src";
import { loadBundle, resetActionIDCounter } from "./fixtures/utils";
import { BULLY_ID, INITIAL_MOOD, VICTIM_ID, setup } from "./fixtures/action-with-effects/setup";

const bundle = loadBundle("action-with-effects");

describe("effects", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    it("applies compound assignment effects to entity data", async () => {
        const { state, adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        // Force the insult action with explicit role bindings
        await attemptAction({
            actionName: "insult",
            initiatorID: BULLY_ID,
            precastBindings: {
                bully: [BULLY_ID],
                victim: [VICTIM_ID],
            },
        });
        const victimMood = (state.entities[VICTIM_ID] as any).mood;
        expect(victimMood).toBe(INITIAL_MOOD - 10);
        const bullyMood = (state.entities[BULLY_ID] as any).mood;
        expect(bullyMood).toBe(INITIAL_MOOD + 1);
    });

    it("applies effects cumulatively over multiple performances", async () => {
        const { state, adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        // Perform the insult action twice
        await attemptAction({
            actionName: "insult",
            initiatorID: BULLY_ID,
            precastBindings: {
                bully: [BULLY_ID],
                victim: [VICTIM_ID],
            },
        });
        await attemptAction({
            actionName: "insult",
            initiatorID: BULLY_ID,
            precastBindings: {
                bully: [BULLY_ID],
                victim: [VICTIM_ID],
            },
        });
        const victimMood = (state.entities[VICTIM_ID] as any).mood;
        expect(victimMood).toBe(INITIAL_MOOD - 20);
        const bullyMood = (state.entities[BULLY_ID] as any).mood;
        expect(bullyMood).toBe(INITIAL_MOOD + 2);
    });
});
