/**
 * Tests for reaction queueing.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { initializeVivRuntime, attemptAction, selectAction } from "../src";
import { loadBundle, resetActionIDCounter } from "./fixtures/utils";
import {
    setup,
    PROVOKER_ID,
    TARGET_ID,
} from "./fixtures/action-with-reactions/setup";
import {
    setup as setupUrgency,
    AGGRESSOR_ID,
    TARGET_ID as URG_TARGET_ID,
} from "./fixtures/reaction-with-urgency/setup";

const bundle = loadBundle("action-with-reactions");
const urgencyBundle = loadBundle("reaction-with-urgency");

describe("reactions", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    it("queues a reaction after performing the triggering action", async () => {
        const { state, adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        // Force the provoke action
        await attemptAction({
            actionName: "provoke",
            initiatorID: PROVOKER_ID,
            precastBindings: {
                provoker: [PROVOKER_ID],
                target: [TARGET_ID],
            },
        });
        // The provoke action should be in the chronicle
        expect(state.actions).toHaveLength(1);
        // The retaliate action should now be queued for the target. Selecting for
        // the target should perform it.
        const result = await selectAction({ initiatorID: TARGET_ID });
        expect(result).not.toBeNull();
        // Now both provoke and retaliate should be in the chronicle
        expect(state.actions).toHaveLength(2);
        const retaliateAction = state.entities[state.actions[1]] as any;
        expect(retaliateAction.name).toBe("retaliate");
        // The roles should be swapped: target becomes aggressor, provoker becomes victim
        expect(retaliateAction.bindings.aggressor).toContain(TARGET_ID);
        expect(retaliateAction.bindings.victim).toContain(PROVOKER_ID);
    });
});

describe("urgent reactions", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    it("queues an urgent reaction that is selected with urgentOnly", async () => {
        const { state, adapter } = setupUrgency();
        initializeVivRuntime({
            contentBundle: urgencyBundle,
            adapter,
        });
        // Provoke triggers an urgent retaliate reaction for the target
        await attemptAction({
            actionName: "provoke",
            initiatorID: AGGRESSOR_ID,
            precastBindings: {
                aggressor: [AGGRESSOR_ID],
                target: [URG_TARGET_ID],
            },
        });
        expect(state.actions).toHaveLength(1);
        // Select with urgentOnly -- should find the urgent reaction
        const result = await selectAction({
            initiatorID: URG_TARGET_ID,
            urgentOnly: true,
        });
        expect(result).not.toBeNull();
        expect(state.actions).toHaveLength(2);
        const retaliateAction = state.entities[state.actions[1]] as any;
        expect(retaliateAction.name).toBe("retaliate");
    });

    it("returns null with urgentOnly when no urgent actions are queued", async () => {
        const { adapter } = setupUrgency();
        initializeVivRuntime({
            contentBundle: urgencyBundle,
            adapter,
        });
        // No actions performed, nothing queued
        const result = await selectAction({
            initiatorID: URG_TARGET_ID,
            urgentOnly: true,
        });
        expect(result).toBeNull();
    });

    it("populates the causes chain between triggering and queued action", async () => {
        const { state, adapter } = setupUrgency();
        initializeVivRuntime({
            contentBundle: urgencyBundle,
            adapter,
        });
        await attemptAction({
            actionName: "provoke",
            initiatorID: AGGRESSOR_ID,
            precastBindings: {
                aggressor: [AGGRESSOR_ID],
                target: [URG_TARGET_ID],
            },
        });
        const provokeID = state.actions[0];
        await selectAction({
            initiatorID: URG_TARGET_ID,
            urgentOnly: true,
        });
        const retaliateAction = state.entities[state.actions[1]] as any;
        // The retaliate action should list provoke as a cause
        expect(retaliateAction.causes).toContain(provokeID);
    });

    it("urgentOnly returns null when only non-urgent actions are queued", async () => {
        const { state, adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        // Provoke queues a non-urgent retaliate reaction
        await attemptAction({
            actionName: "provoke",
            initiatorID: PROVOKER_ID,
            precastBindings: {
                provoker: [PROVOKER_ID],
                target: [TARGET_ID],
            },
        });
        expect(state.actions).toHaveLength(1);
        // urgentOnly should return null
        const result = await selectAction({
            initiatorID: TARGET_ID,
            urgentOnly: true,
        });
        expect(result).toBeNull();
        // Without urgentOnly, it should succeed
        const normalResult = await selectAction({ initiatorID: TARGET_ID });
        expect(normalResult).not.toBeNull();
    });
});
