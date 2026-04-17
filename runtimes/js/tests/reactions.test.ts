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
import {
    GREETER_ID as HEARER_GREETER_ID,
    LISTENER_ID as HEARER_LISTENER_ID,
    OTHER_ID as HEARER_OTHER_ID,
    setup as setupHearer,
} from "./fixtures/reaction-with-hearer/setup";

const bundle = loadBundle("action-with-reactions");
const urgencyBundle = loadBundle("reaction-with-urgency");
const hearerBundle = loadBundle("reaction-with-hearer");

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

describe("hearer reactions and effects", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    it("skips hearer-referencing effects and reactions during initial performance", async () => {
        const { state, adapter, marks } = setupHearer();
        initializeVivRuntime({
            contentBundle: hearerBundle,
            adapter,
        });
        // Perform the greet: hearer is unbound during initial performance
        await attemptAction({
            actionName: "greet",
            initiatorID: HEARER_GREETER_ID,
            precastBindings: {
                greeter: [HEARER_GREETER_ID],
                other: [HEARER_OTHER_ID],
            },
        });
        // The non-hearer effect fires; the hearer-referencing effect is skipped
        expect(marks.greeters).toEqual([HEARER_GREETER_ID]);
        expect(marks.hearers).toEqual([]);
        // The non-hearer reaction queued a ripple for the greeter
        const next = await selectAction({ initiatorID: HEARER_GREETER_ID });
        expect(next).not.toBeNull();
        const rippleAction = state.entities[state.actions[state.actions.length - 1]] as any;
        expect(rippleAction.name).toBe("ripple");
        // The hearer-referencing reaction was skipped, so no acknowledge is queued for the other
        const acknowledgeForOther = await selectAction({ initiatorID: HEARER_OTHER_ID });
        expect(acknowledgeForOther).toBeNull();
    });

    it("fires hearer-referencing effects and reactions during post-hoc knowledge relay", async () => {
        const { state, adapter, marks } = setupHearer();
        initializeVivRuntime({
            contentBundle: hearerBundle,
            adapter,
        });
        // Perform the greet (initial performance)
        await attemptAction({
            actionName: "greet",
            initiatorID: HEARER_GREETER_ID,
            precastBindings: {
                greeter: [HEARER_GREETER_ID],
                other: [HEARER_OTHER_ID],
            },
        });
        const incidentID = state.actions[0];
        // Reset marks so the next assertions isolate post-hoc behavior
        marks.hearers.length = 0;
        marks.greeters.length = 0;
        // Gossip to the listener, casting the greet in the `@incident` role to relay knowledge
        await attemptAction({
            actionName: "gossip",
            initiatorID: HEARER_GREETER_ID,
            precastBindings: {
                gossiper: [HEARER_GREETER_ID],
                listener: [HEARER_LISTENER_ID],
                incident: [incidentID],
            },
        });
        // The hearer-referencing effect fired for the listener, who is bound as `@hearer` post-hoc
        expect(marks.hearers).toEqual([HEARER_LISTENER_ID]);
        // The non-hearer effect did not fire again during post-hoc dispatch
        expect(marks.greeters).toEqual([]);
        // The hearer-referencing reaction queued an acknowledge for the listener
        const listenerNext = await selectAction({ initiatorID: HEARER_LISTENER_ID });
        expect(listenerNext).not.toBeNull();
        const acknowledgeAction = state.entities[state.actions[state.actions.length - 1]] as any;
        expect(acknowledgeAction.name).toBe("acknowledge");
    });
});
