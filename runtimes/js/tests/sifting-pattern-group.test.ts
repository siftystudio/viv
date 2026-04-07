/**
 * Tests for sifting patterns with group action roles and relaxed entity uniqueness.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { attemptAction, initializeVivRuntime, runSiftingPattern } from "../src";
import { loadBundle, resetActionIDCounter } from "./fixtures/utils";
import { OTHER_ID, PROTAGONIST_ID, setup } from "./fixtures/sifting-pattern-group/setup";

const bundle = loadBundle("sifting-pattern-group");

describe("sifting pattern group action roles", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    it("allows the same action in a roles entry and multiple actions entries", async () => {
        const { adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        // Perform three deeds so the pool has multiple candidates
        await attemptAction({
            actionName: "deed",
            initiatorID: PROTAGONIST_ID,
            precastBindings: {
                doer: [PROTAGONIST_ID],
                witness: [OTHER_ID],
            },
        });
        await attemptAction({
            actionName: "deed",
            initiatorID: PROTAGONIST_ID,
            precastBindings: {
                doer: [PROTAGONIST_ID],
                witness: [OTHER_ID],
            },
        });
        await attemptAction({
            actionName: "deed",
            initiatorID: PROTAGONIST_ID,
            precastBindings: {
                doer: [PROTAGONIST_ID],
                witness: [OTHER_ID],
            },
        });
        // Sift for overlapping-roles over the protagonist's memories
        const match = await runSiftingPattern({
            patternName: "overlapping-roles",
            precastBindings: {
                person: [PROTAGONIST_ID],
            },
            searchDomain: PROTAGONIST_ID,
        });
        // The match succeeds -- the uniqueness relaxation allows @shared (a roles:
        // entry) and @group-a*/@group-b* (actions: entries) to all cast from the
        // same pool of three actions without conflict.
        expect(match).not.toBeNull();
        if (match === null) {
            throw new Error("Expected match");
        }
        // Only actions: entries appear in the match (roles: entries like @shared do not)
        expect(match["group-a"].length).toBeGreaterThanOrEqual(1);
        expect(match["group-b"].length).toBeGreaterThanOrEqual(1);
        // Both group roles should be able to include the same actions — the
        // uniqueness constraint is relaxed for actions: entries
        const groupBSet = new Set(match["group-b"]);
        const overlap = match["group-a"].some(uid => groupBSet.has(uid));
        expect(overlap).toBe(true);
    });
});
