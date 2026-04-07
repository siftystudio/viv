/**
 * Tests for adapter configuration parameters.
 *
 * Each test sets a custom config value on the adapter and verifies that the
 * runtime's behavior changes accordingly. This tests the full path from
 * adapter interface to observed behavior.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { initializeVivRuntime, attemptAction, fadeCharacterMemories } from "../src";
import { loadBundle, resetActionIDCounter } from "./fixtures/utils";
import { setup as setupLoop, COUNTER_ID } from "./fixtures/action-with-loops/setup";
import { setup as setupSalience, OBSERVER_ID, SUBJECT_ID } from "./fixtures/action-with-saliences/setup";

const loopBundle = loadBundle("action-with-loops");
const salienceBundle = loadBundle("action-with-saliences");

describe("adapter config", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    it("honors a custom loopMaxIterations value", async () => {
        // The tally action sums @counter.values into @counter.total via a loop.
        // With values [3, 7, 5] and loopMaxIterations capped at 2, the loop should
        // stop after two iterations, yielding 10 instead of the full sum of 15.
        const { state, adapter } = setupLoop([3, 7, 5]);
        (adapter as any).config = { loopMaxIterations: 2 };
        initializeVivRuntime({
            contentBundle: loopBundle,
            adapter,
        });
        await attemptAction({
            actionName: "tally",
            initiatorID: COUNTER_ID,
            precastBindings: { counter: [COUNTER_ID] },
        });
        const counter = state.entities[COUNTER_ID] as any;
        expect(counter.total).toBe(10);
    });

    it("honors a custom memoryRetentionMonthlyMultiplier value", async () => {
        // The witness action gives initial salience 5.0. With a custom multiplier
        // of 0.5 (instead of the default 0.9), one month of fading should halve
        // the salience to 2.5.
        const { state, adapter } = setupSalience();
        (adapter as any).config = { memoryRetentionMonthlyMultiplier: 0.5 };
        initializeVivRuntime({
            contentBundle: salienceBundle,
            adapter,
        });
        await attemptAction({
            actionName: "witness",
            initiatorID: OBSERVER_ID,
            precastBindings: {
                observer: [OBSERVER_ID],
                subject: [SUBJECT_ID],
            },
        });
        const actionID = state.actions[0];
        // Advance time by one month and fade
        const minutesPerMonth = Math.floor((365 / 12) * 24 * 60);
        state.timestamp = minutesPerMonth;
        await fadeCharacterMemories();
        const memory = (state.entities[OBSERVER_ID] as any).memories[actionID];
        expect(memory.salience).toBeCloseTo(2.5, 1);
    });

    it("honors a custom memoryForgettingSalienceThreshold value", async () => {
        // The witness action gives initial salience 5.0. With a high forgetting
        // threshold of 6.0 (above the initial salience), the memory should be
        // marked forgotten after the first fade.
        const { state, adapter } = setupSalience();
        (adapter as any).config = { memoryForgettingSalienceThreshold: 6.0 };
        initializeVivRuntime({
            contentBundle: salienceBundle,
            adapter,
        });
        await attemptAction({
            actionName: "witness",
            initiatorID: OBSERVER_ID,
            precastBindings: {
                observer: [OBSERVER_ID],
                subject: [SUBJECT_ID],
            },
        });
        const actionID = state.actions[0];
        // The memory starts with salience 5.0, which is below the threshold of 6.0.
        // Per formation semantics, it is NOT immediately marked forgotten — that
        // happens on the first fade.
        const memoryBefore = (state.entities[OBSERVER_ID] as any).memories[actionID];
        expect(memoryBefore.forgotten).toBe(false);
        // Advance time by one month and fade
        const minutesPerMonth = Math.floor((365 / 12) * 24 * 60);
        state.timestamp = minutesPerMonth;
        await fadeCharacterMemories();
        const memoryAfter = (state.entities[OBSERVER_ID] as any).memories[actionID];
        expect(memoryAfter.forgotten).toBe(true);
    });

    it("honors a custom memoryMaxSalience value", async () => {
        // The witness action gives initial salience 5.0. With memoryMaxSalience
        // capped at 3.0, the initial salience should be clamped.
        const { state, adapter } = setupSalience();
        (adapter as any).config = { memoryMaxSalience: 3.0 };
        initializeVivRuntime({
            contentBundle: salienceBundle,
            adapter,
        });
        await attemptAction({
            actionName: "witness",
            initiatorID: OBSERVER_ID,
            precastBindings: {
                observer: [OBSERVER_ID],
                subject: [SUBJECT_ID],
            },
        });
        const actionID = state.actions[0];
        const memory = (state.entities[OBSERVER_ID] as any).memories[actionID];
        expect(memory.salience).toBe(3.0);
    });
});
