/**
 * Tests for sifting pattern execution.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { attemptAction, initializeVivRuntime, runSiftingPattern } from "../src";
import { loadBundle, resetActionIDCounter } from "./fixtures/utils";
import { OTHER_ID, PROTAGONIST_ID, setup } from "./fixtures/sifting-pattern/setup";

const bundle = loadBundle("sifting-pattern");

describe("sifting patterns", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    it("matches an action in the protagonist's memory", async () => {
        const { adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        // Perform the celebrate action (tagged "happy")
        await attemptAction({
            actionName: "celebrate",
            initiatorID: PROTAGONIST_ID,
            precastBindings: {
                celebrant: [PROTAGONIST_ID],
                guest: [OTHER_ID],
            },
        });
        // Sift for good-day pattern over the protagonist's memories
        const match = await runSiftingPattern({
            patternName: "good-day",
            precastBindings: {
                protagonist: [PROTAGONIST_ID],
            },
            searchDomain: PROTAGONIST_ID,
        });
        expect(match).not.toBeNull();
        // The match should bind the event role to the celebrate action
        if (match === null) {
            throw new Error("Expected match");
        }
        expect(match.event).toBeDefined();
        expect(match.event).toHaveLength(1);
    });

    it("returns null when no memories match the pattern", async () => {
        const { adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        // Perform the argue action (tagged "sad", not "happy")
        await attemptAction({
            actionName: "argue",
            initiatorID: PROTAGONIST_ID,
            precastBindings: {
                instigator: [PROTAGONIST_ID],
                opponent: [OTHER_ID],
            },
        });
        // Sift for good-day — should not match because there are no happy memories
        const match = await runSiftingPattern({
            patternName: "good-day",
            precastBindings: {
                protagonist: [PROTAGONIST_ID],
            },
            searchDomain: PROTAGONIST_ID,
        });
        expect(match).toBeNull();
    });

    it("throws for an unknown pattern name", async () => {
        const { adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        await expect(
            runSiftingPattern({ patternName: "nonexistent" })
        ).rejects.toThrow("Cannot run sifting pattern");
    });
});
