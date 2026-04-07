/**
 * Tests for enum resolution through the adapter.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { initializeVivRuntime, selectAction } from "../src";
import { loadBundle, resetActionIDCounter } from "./fixtures/utils";
import { JUDGE_ID, SUBJECT_ID, setup } from "./fixtures/action-with-enums/setup";

const bundle = loadBundle("action-with-enums");

describe("enums", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    it("resolves enum in condition -- action succeeds when threshold met", async () => {
        // Subject score (5) > #THRESHOLD (3), so condition holds
        const { state, adapter } = setup(5);
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        const result = await selectAction({ initiatorID: JUDGE_ID });
        expect(result).not.toBeNull();
        expect(state.actions).toHaveLength(1);
    });

    it("resolves enum in condition -- action fails when threshold not met", async () => {
        // Subject score (1) < #THRESHOLD (3), so condition fails
        const { state, adapter } = setup(1);
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        const result = await selectAction({ initiatorID: JUDGE_ID });
        expect(result).toBeNull();
        expect(state.actions).toHaveLength(0);
    });

    it("resolves enum in effect -- entity property set to enum value", async () => {
        const { state, adapter } = setup(5);
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        await selectAction({ initiatorID: JUDGE_ID });
        // #RATING_GOOD = 10
        expect((state.entities[SUBJECT_ID] as any).rating).toBe(10);
    });

    it("resolves enum in importance -- action view has correct importance", async () => {
        const { state, adapter } = setup(5);
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        await selectAction({ initiatorID: JUDGE_ID });
        const actionView = state.entities[state.actions[0]] as any;
        // #IMPORTANCE_HIGH = 5
        expect(actionView.importance).toBe(5);
    });

    it("resolves enum in salience -- memory has correct salience", async () => {
        const { state, adapter } = setup(5);
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        await selectAction({ initiatorID: JUDGE_ID });
        const actionID = state.actions[0];
        const judge = state.entities[JUDGE_ID] as any;
        // #SALIENCE_MEDIUM = 4
        expect(judge.memories[actionID].salience).toBe(4);
    });
});
