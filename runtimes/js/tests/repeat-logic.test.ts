/**
 * Tests for reaction repeat logic.
 */

import { beforeEach, describe, expect, it } from "vitest";

import {
    attemptAction,
    initializeVivRuntime,
    selectAction,
    tickPlanner,
} from "../src";
import { loadBundle, resetActionIDCounter } from "./fixtures/utils";
import {
    PROVOKER_ID as UNCOND_PROVOKER_ID,
    TARGET_ID as UNCOND_TARGET_ID,
    setup as unconditionalSetup,
} from "./fixtures/action-with-repeat-logic/setup";
import {
    PROVOKER_ID as COND_PROVOKER_ID,
    TARGET_ID as COND_TARGET_ID,
    setup as conditionalSetup,
} from "./fixtures/action-with-conditional-repeat/setup";
import {
    BYSTANDER_ID,
    GUARD_ID,
    setup as planSetup,
} from "./fixtures/plan-with-repeat-logic/setup";
import {
    GREETER_ID,
    setup as selectorSetup,
} from "./fixtures/selector-with-repeat-logic/setup";

const unconditionalBundle = loadBundle("action-with-repeat-logic");
const conditionalBundle = loadBundle("action-with-conditional-repeat");
const planBundle = loadBundle("plan-with-repeat-logic");
const selectorBundle = loadBundle("selector-with-repeat-logic");

describe("repeat logic", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    describe("unconditional action repeat", () => {
        it("re-queues an action up to maxRepeats times after each success", async () => {
            const { state, adapter } = unconditionalSetup();
            initializeVivRuntime({
                contentBundle: unconditionalBundle,
                adapter,
            });
            // Perform the triggering action, which queues retaliate with repeatLogic (maxRepeats: 2)
            await attemptAction({
                actionName: "provoke",
                initiatorID: UNCOND_PROVOKER_ID,
                precastBindings: {
                    provoker: [UNCOND_PROVOKER_ID],
                    target: [UNCOND_TARGET_ID],
                },
            });
            expect(state.actions).toHaveLength(1);
            // First retaliate: the original queued action succeeds, re-queued with maxRepeats 1
            const firstResult = await selectAction({ initiatorID: UNCOND_TARGET_ID });
            expect(firstResult).not.toBeNull();
            expect(state.actions).toHaveLength(2);
            // Second retaliate: first repeat succeeds, re-queued with maxRepeats 0
            const secondResult = await selectAction({ initiatorID: UNCOND_TARGET_ID });
            expect(secondResult).not.toBeNull();
            expect(state.actions).toHaveLength(3);
            // Third retaliate: second repeat succeeds, maxRepeats is 0 so no re-queue
            const thirdResult = await selectAction({ initiatorID: UNCOND_TARGET_ID });
            expect(thirdResult).not.toBeNull();
            expect(state.actions).toHaveLength(4);
            // No more queued actions, and both actions are reserved, so nothing to select
            const fourthResult = await selectAction({ initiatorID: UNCOND_TARGET_ID });
            expect(fourthResult).toBeNull();
            expect(state.actions).toHaveLength(4);
            // All three retaliations have the correct name
            for (let actionIndex = 1; actionIndex < 4; actionIndex++) {
                const actionView = state.entities[state.actions[actionIndex]] as any;
                expect(actionView.name).toBe("retaliate");
            }
        });

        it("re-queued actions share the same causes as the original (siblings, not a chain)", async () => {
            const { state, adapter } = unconditionalSetup();
            initializeVivRuntime({
                contentBundle: unconditionalBundle,
                adapter,
            });
            // Perform the triggering action
            await attemptAction({
                actionName: "provoke",
                initiatorID: UNCOND_PROVOKER_ID,
                precastBindings: {
                    provoker: [UNCOND_PROVOKER_ID],
                    target: [UNCOND_TARGET_ID],
                },
            });
            const provokeID = state.actions[0];
            // Perform all three retaliations (original + 2 repeats)
            await selectAction({ initiatorID: UNCOND_TARGET_ID });
            await selectAction({ initiatorID: UNCOND_TARGET_ID });
            await selectAction({ initiatorID: UNCOND_TARGET_ID });
            expect(state.actions).toHaveLength(4);
            // All three retaliations should list the provoke as their cause — they are
            // siblings, not a causal chain where each retaliate causes the next
            const firstRetaliate = state.entities[state.actions[1]] as any;
            const secondRetaliate = state.entities[state.actions[2]] as any;
            const thirdRetaliate = state.entities[state.actions[3]] as any;
            expect(firstRetaliate.causes).toContain(provokeID);
            expect(secondRetaliate.causes).toContain(provokeID);
            expect(thirdRetaliate.causes).toContain(provokeID);
            // None of the retaliations should be caused by another retaliation
            const retaliateIDs = [state.actions[1], state.actions[2], state.actions[3]];
            for (const retaliateAction of [firstRetaliate, secondRetaliate, thirdRetaliate]) {
                for (const retaliateID of retaliateIDs) {
                    expect(retaliateAction.causes).not.toContain(retaliateID);
                }
            }
        });
    });

    describe("conditional action repeat", () => {
        it("stops re-queueing when repeat conditions no longer hold", async () => {
            const { state, adapter } = conditionalSetup();
            initializeVivRuntime({
                contentBundle: conditionalBundle,
                adapter,
            });
            // Target starts with anger: 2. Each retaliate effect decrements @aggressor.anger by 1
            // (aggressor is bound to the target). Repeat condition @target.anger > 0 is evaluated
            // using the provoke action's dehydrated evaluation context, where @target resolves to
            // cid-target — so the same character's anger is both decremented and checked.
            expect((state.entities[COND_TARGET_ID] as any).anger).toBe(2);
            // Perform the triggering action
            await attemptAction({
                actionName: "provoke",
                initiatorID: COND_PROVOKER_ID,
                precastBindings: {
                    provoker: [COND_PROVOKER_ID],
                    target: [COND_TARGET_ID],
                },
            });
            expect(state.actions).toHaveLength(1);
            // First retaliate: anger decremented from 2 to 1, condition (anger > 0) holds, re-queued
            const firstResult = await selectAction({ initiatorID: COND_TARGET_ID });
            expect(firstResult).not.toBeNull();
            expect(state.actions).toHaveLength(2);
            expect((state.entities[COND_TARGET_ID] as any).anger).toBe(1);
            // Second retaliate: anger decremented from 1 to 0, condition (anger > 0) fails, not re-queued
            const secondResult = await selectAction({ initiatorID: COND_TARGET_ID });
            expect(secondResult).not.toBeNull();
            expect(state.actions).toHaveLength(3);
            expect((state.entities[COND_TARGET_ID] as any).anger).toBe(0);
            // No more queued actions
            const thirdResult = await selectAction({ initiatorID: COND_TARGET_ID });
            expect(thirdResult).toBeNull();
            expect(state.actions).toHaveLength(3);
        });
    });

    describe("plan repeat", () => {
        it("re-queues a plan upon successful resolution across multiple ticks", async () => {
            const { state, adapter } = planSetup();
            initializeVivRuntime({
                contentBundle: planBundle,
                adapter,
            });
            // Perform the trigger action, which queues plan patrol with repeatLogic (maxRepeats: 1).
            // The plan uses a reaction window, so it blocks until its queued action is performed.
            await attemptAction({
                actionName: "trigger",
                initiatorID: GUARD_ID,
                precastBindings: {
                    guard: [GUARD_ID],
                    bystander: [BYSTANDER_ID],
                },
            });
            expect(state.actions).toHaveLength(1);
            // Tick 1: launch the plan, open reaction window, queue check-post. Plan is now
            // blocked on the reaction window, waiting for check-post to be performed.
            await tickPlanner();
            // Perform the queued check-post, which resolves the reaction window
            const firstCheckPost = await selectAction({ initiatorID: GUARD_ID });
            expect(firstCheckPost).not.toBeNull();
            expect(state.actions).toHaveLength(2);
            expect((state.entities[state.actions[1]] as any).name).toBe("check-post");
            // Tick 2: resume plan execution. Reaction window closes (check-post was performed),
            // plan hits succeed instruction, resolves successfully. Repeat conditions hold and
            // maxRepeats (1) > 0, so the plan is re-queued with maxRepeats 0.
            await tickPlanner();
            // Tick 3: launch the re-queued plan. Same flow: open window, queue check-post, block.
            await tickPlanner();
            // Perform the second check-post
            const secondCheckPost = await selectAction({ initiatorID: GUARD_ID });
            expect(secondCheckPost).not.toBeNull();
            expect(state.actions).toHaveLength(3);
            expect((state.entities[state.actions[2]] as any).name).toBe("check-post");
            // Tick 4: resume re-queued plan. Resolves successfully, but maxRepeats is 0 — no re-queue.
            await tickPlanner();
            // No more plans to launch, no more queued actions
            await tickPlanner();
            const thirdCheckPost = await selectAction({ initiatorID: GUARD_ID });
            expect(thirdCheckPost).toBeNull();
            expect(state.actions).toHaveLength(3);
        });
    });

    describe("selector repeat", () => {
        it("re-queues the selector itself, not the specific action that was selected", async () => {
            const { state, adapter } = selectorSetup();
            initializeVivRuntime({
                contentBundle: selectorBundle,
                adapter,
            });
            // Perform the trigger, which queues selector choose-greeting with repeatLogic (maxRepeats: 1).
            // The selector's candidate actions (wave, nod) are all reserved, so they can only be
            // performed via the selector — not via general action selection.
            await attemptAction({
                actionName: "trigger",
                initiatorID: GREETER_ID,
                precastBindings: {
                    greeter: [GREETER_ID],
                },
            });
            expect(state.actions).toHaveLength(1);
            // First greeting: the queued selector picks one of wave/nod, re-queued with maxRepeats 0
            const firstResult = await selectAction({ initiatorID: GREETER_ID });
            expect(firstResult).not.toBeNull();
            expect(state.actions).toHaveLength(2);
            const firstName = (state.entities[state.actions[1]] as any).name;
            expect(["wave", "nod"]).toContain(firstName);
            // Second greeting: the re-queued selector picks again, maxRepeats is 0 so no re-queue
            const secondResult = await selectAction({ initiatorID: GREETER_ID });
            expect(secondResult).not.toBeNull();
            expect(state.actions).toHaveLength(3);
            const secondName = (state.entities[state.actions[2]] as any).name;
            expect(["wave", "nod"]).toContain(secondName);
            // No more queued selectors, all actions are reserved, nothing to select
            const thirdResult = await selectAction({ initiatorID: GREETER_ID });
            expect(thirdResult).toBeNull();
            expect(state.actions).toHaveLength(3);
        });
    });
});
