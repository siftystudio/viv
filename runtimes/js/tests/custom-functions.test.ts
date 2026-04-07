/**
 * Tests for custom function calls through the adapter.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { VivInterpreterError, initializeVivRuntime, selectAction } from "../src";
import { loadBundle, resetActionIDCounter } from "./fixtures/utils";
import { ACTOR_ID, setup } from "./fixtures/action-with-custom-functions/setup";

const bundle = loadBundle("action-with-custom-functions");

describe("custom functions", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    it("calls the custom function during effect execution", async () => {
        const { state, adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        await selectAction({ initiatorID: ACTOR_ID });
        // The default function sets transformed = true
        expect((state.entities[ACTOR_ID] as any).transformed).toBe(true);
    });

    it("passes dehydrated entity IDs as arguments", async () => {
        let receivedArgs: unknown[] = [];
        const { adapter } = setup((...args: unknown[]) => {
            receivedArgs = args;
        });
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        await selectAction({ initiatorID: ACTOR_ID });
        // The function should receive the entity ID string, not entity data
        expect(receivedArgs[0]).toBe(ACTOR_ID);
        expect(typeof receivedArgs[0]).toBe("string");
    });

    it("wraps function errors as VivInterpreterError", async () => {
        const { adapter } = setup(() => {
            throw new Error("function exploded");
        });
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        await expect(selectAction({ initiatorID: ACTOR_ID })).rejects.toThrow(VivInterpreterError);
    });
});
