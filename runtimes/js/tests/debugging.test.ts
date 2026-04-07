/**
 * Tests for the debugging watchlist system.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { getDebuggingData, initializeVivRuntime, selectAction } from "../src";
import { RoleCastingBacktrackReason } from "../src/debugger";
import { loadBundle, resetActionIDCounter } from "./fixtures/utils";
import { CAPTAIN_ID, setup } from "./fixtures/debugging-watchlist/setup";

const bundle = loadBundle("debugging-watchlist");

describe("debugging watchlists", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    it("records targeting attempts, casting attempts, backtracking reasons, and condition test results", async () => {
        const { adapter } = setup();
        (adapter as any).debug = {
            watchlists: {
                actions: ["recruit"],
            },
        };
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        // Attempt action selection -- the action will fail targeting because no candidate
        // is eligible, but the debugger will record everything that happened along the way
        await selectAction({ initiatorID: CAPTAIN_ID });
        const debuggingData = await getDebuggingData();
        if (debuggingData.watchlists == null) {
            throw new Error("Expected watchlists to be defined");
        }
        const recruitState = debuggingData.watchlists.actions["recruit"];
        expect(recruitState.targetingAttempts).toBe(1);
        expect(recruitState.castingAttempts["recruit"]).toBe(1);
        expect(recruitState.backtrackingReasons["recruit"][RoleCastingBacktrackReason.CandidateFailedConditions]).toBe(2);
        const conditionKeys = Object.keys(recruitState.conditionTestResults);
        expect(conditionKeys).toHaveLength(2);
        const conditionResults = Object.values(recruitState.conditionTestResults);
        const globalCondition = conditionResults.find(c => c.condition === "true");
        const roleCondition = conditionResults.find(c => c.condition !== "true");
        expect(globalCondition).not.toBeUndefined();
        expect(globalCondition?.successes).toBe(1);
        expect(globalCondition?.failures).toBe(0);
        expect(roleCondition).not.toBeUndefined();
        expect(roleCondition?.successes).toBe(0);
        expect(roleCondition?.failures).toBe(2);
    });
});
