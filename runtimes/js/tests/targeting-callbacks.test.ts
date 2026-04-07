/**
 * Tests for the targeting callback debugging facility.
 */

import { beforeEach, describe, expect, it } from "vitest";

import type { ActionTargetingEvent, PlanExecutionEvent } from "../src";
import {
    ActionTargetingEventImpetus,
    PlanExecutionEventType,
    TargetingEventStatus,
    attemptAction,
    initializeVivRuntime,
    queuePlan,
    selectAction,
    tickPlanner
} from "../src";
import { loadBundle, resetActionIDCounter } from "./fixtures/utils";
import { CHARACTER_ID, setup as setupMinimal } from "./fixtures/minimal-action/setup";
import { SPEAKER_ID, setup as setupConditions } from "./fixtures/action-with-conditions/setup";
import { PLOTTER_ID, TARGET_ID, setup as setupPlan } from "./fixtures/plan-single-phase/setup";
import { AGENT_ID, setup as setupMultiPlan } from "./fixtures/plan-multi-phase/setup";
import { PATIENT_ID, setup as setupWaitPlan } from "./fixtures/plan-with-wait/setup";
import { OPERATOR_ID, setup as setupReactionWindowPlan } from "./fixtures/plan-with-reaction-window/setup";

const minimalBundle = loadBundle("minimal-action");
const conditionsBundle = loadBundle("action-with-conditions");
const planBundle = loadBundle("plan-single-phase");
const multiPlanBundle = loadBundle("plan-multi-phase");
const waitPlanBundle = loadBundle("plan-with-wait");
const reactionWindowBundle = loadBundle("plan-with-reaction-window");

describe("action targeting callbacks", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    it("emits started then succeeded for a successful general action", async () => {
        const events: ActionTargetingEvent[] = [];
        const { adapter } = setupMinimal();
        (adapter as any).debug = {
            callbacks: {
                onActionTargetingEvent: (event: ActionTargetingEvent) => {
                    events.push({ ...event });
                },
            },
        };
        initializeVivRuntime({
            contentBundle: minimalBundle,
            adapter,
        });
        await selectAction({ initiatorID: CHARACTER_ID });
        // There should be at least one started event followed by a succeeded event for "greet"
        const greetStarted = events.find(
            event => event.action === "greet" && event.status === TargetingEventStatus.Started
        );
        const greetSucceeded = events.find(
            event => event.action === "greet" && event.status === TargetingEventStatus.Succeeded
        );
        expect(greetStarted).toBeDefined();
        expect(greetSucceeded).toBeDefined();
        if (greetStarted !== undefined && greetSucceeded !== undefined) {
            // The source should be general, since this is not a queued action
            expect(greetStarted.impetus).toBe(ActionTargetingEventImpetus.General);
            expect(greetSucceeded.impetus).toBe(ActionTargetingEventImpetus.General);
            // The initiator should be our character
            expect(greetStarted.initiator).toBe(CHARACTER_ID);
            expect(greetSucceeded.initiator).toBe(CHARACTER_ID);
            // The started event should precede the succeeded event
            const startedIndex = events.indexOf(greetStarted);
            const succeededIndex = events.indexOf(greetSucceeded);
            expect(startedIndex).toBeLessThan(succeededIndex);
        }
    });

    it("emits started then failed for an action whose conditions fail", async () => {
        const events: ActionTargetingEvent[] = [];
        const { state, adapter } = setupConditions();
        // Set the speaker's mood to zero so the mood > 0 condition fails
        (state.entities[SPEAKER_ID] as any).mood = 0;
        (adapter as any).debug = {
            callbacks: {
                onActionTargetingEvent: (event: ActionTargetingEvent) => {
                    events.push({ ...event });
                },
            },
        };
        initializeVivRuntime({
            contentBundle: conditionsBundle,
            adapter,
        });
        await selectAction({ initiatorID: SPEAKER_ID });
        // There should be a started event for "confide" followed by a failed event
        const confideStarted = events.find(
            event => event.action === "confide" && event.status === TargetingEventStatus.Started
        );
        const confideFailed = events.find(
            event => event.action === "confide" && event.status === TargetingEventStatus.Failed
        );
        expect(confideStarted).toBeDefined();
        expect(confideFailed).toBeDefined();
        // There should be no succeeded event for "confide"
        const confideSucceeded = events.find(
            event => event.action === "confide" && event.status === TargetingEventStatus.Succeeded
        );
        expect(confideSucceeded).toBeUndefined();
    });

    it("emits events with source 'queued' for queued actions", async () => {
        const events: ActionTargetingEvent[] = [];
        const { adapter } = setupPlan();
        (adapter as any).debug = {
            callbacks: {
                onActionTargetingEvent: (event: ActionTargetingEvent) => {
                    events.push({ ...event });
                },
            },
        };
        initializeVivRuntime({
            contentBundle: planBundle,
            adapter,
        });
        // Queue and execute a plan, which will queue the "ambush" action for the plotter
        await queuePlan({
            planName: "scheme",
            precastBindings: {
                plotter: [PLOTTER_ID],
                target: [TARGET_ID],
            },
        });
        await tickPlanner();
        // Now select an action for the plotter — it should target the queued "ambush" action
        await selectAction({ initiatorID: PLOTTER_ID });
        // The "ambush" action should have been targeted with source "queued"
        const ambushStarted = events.find(
            event => event.action === "ambush" && event.status === TargetingEventStatus.Started
        );
        expect(ambushStarted).toBeDefined();
        if (ambushStarted !== undefined) {
            expect(ambushStarted.impetus).toBe(ActionTargetingEventImpetus.Queued);
        }
    });

    it("emits events with source 'forced' for attemptAction", async () => {
        const events: ActionTargetingEvent[] = [];
        const { adapter } = setupMinimal();
        (adapter as any).debug = {
            callbacks: {
                onActionTargetingEvent: (event: ActionTargetingEvent) => {
                    events.push({ ...event });
                },
            },
        };
        initializeVivRuntime({
            contentBundle: minimalBundle,
            adapter,
        });
        await attemptAction({
            actionName: "greet",
            initiatorID: CHARACTER_ID,
        });
        // The "greet" action should have been targeted with source "forced"
        const greetStarted = events.find(
            event => event.action === "greet" && event.status === TargetingEventStatus.Started
        );
        expect(greetStarted).toBeDefined();
        if (greetStarted !== undefined) {
            expect(greetStarted.impetus).toBe(ActionTargetingEventImpetus.Forced);
        }
    });

    it("does not error when no callback is configured", async () => {
        const { adapter } = setupMinimal();
        initializeVivRuntime({
            contentBundle: minimalBundle,
            adapter,
        });
        // This should complete without error even though no callback is configured
        const result = await selectAction({ initiatorID: CHARACTER_ID });
        expect(result).not.toBeNull();
    });

    it("propagates errors thrown by the callback", async () => {
        const { adapter } = setupMinimal();
        (adapter as any).debug = {
            callbacks: {
                onActionTargetingEvent: () => {
                    throw new Error("Callback error");
                },
            },
        };
        initializeVivRuntime({
            contentBundle: minimalBundle,
            adapter,
        });
        await expect(
            selectAction({ initiatorID: CHARACTER_ID })
        ).rejects.toThrow("Callback error");
    });
});

describe("plan execution callbacks", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    it("emits launched then phaseAdvanced for the initial phase", async () => {
        const events: PlanExecutionEvent[] = [];
        const { adapter } = setupPlan();
        (adapter as any).debug = {
            callbacks: {
                onPlanExecutionEvent: (event: PlanExecutionEvent) => {
                    events.push({ ...event });
                },
            },
        };
        initializeVivRuntime({
            contentBundle: planBundle,
            adapter,
        });
        const planID = await queuePlan({
            planName: "scheme",
            precastBindings: {
                plotter: [PLOTTER_ID],
                target: [TARGET_ID],
            },
        });
        await tickPlanner();
        // The first two events should be launched then phaseAdvanced
        expect(events.length).toBeGreaterThanOrEqual(2);
        expect(events[0].type).toBe(PlanExecutionEventType.Launched);
        expect(events[0].planID).toBe(planID);
        expect(events[0].plan).toBe("scheme");
        expect(events[1].type).toBe(PlanExecutionEventType.PhaseAdvanced);
        expect(events[1].planID).toBe(planID);
        if (events[1].type === PlanExecutionEventType.PhaseAdvanced) {
            expect(events[1].phase).toBe("plot");
        }
    });

    it("emits succeeded after a single-phase plan completes", async () => {
        const events: PlanExecutionEvent[] = [];
        const { adapter } = setupPlan();
        (adapter as any).debug = {
            callbacks: {
                onPlanExecutionEvent: (event: PlanExecutionEvent) => {
                    events.push({ ...event });
                },
            },
        };
        initializeVivRuntime({
            contentBundle: planBundle,
            adapter,
        });
        await queuePlan({
            planName: "scheme",
            precastBindings: {
                plotter: [PLOTTER_ID],
                target: [TARGET_ID],
            },
        });
        await tickPlanner();
        // The last event should be succeeded
        const lastEvent = events[events.length - 1];
        expect(lastEvent.type).toBe(PlanExecutionEventType.Succeeded);
        if (lastEvent.type === PlanExecutionEventType.Succeeded) {
            expect(lastEvent.phase).toBe("plot");
        }
    });

    it("emits phaseAdvanced for each phase in a multi-phase plan", async () => {
        const events: PlanExecutionEvent[] = [];
        const { adapter } = setupMultiPlan();
        (adapter as any).debug = {
            callbacks: {
                onPlanExecutionEvent: (event: PlanExecutionEvent) => {
                    events.push({ ...event });
                },
            },
        };
        initializeVivRuntime({
            contentBundle: multiPlanBundle,
            adapter,
        });
        await queuePlan({
            planName: "operation",
            precastBindings: {
                agent: [AGENT_ID],
            },
        });
        await tickPlanner();
        // Should see: launched, phaseAdvanced(setup), phaseAdvanced(finish), succeeded
        const phaseEvents = events.filter(
            event => event.type === PlanExecutionEventType.PhaseAdvanced
        );
        expect(phaseEvents.length).toBe(2);
        if (phaseEvents[0].type === PlanExecutionEventType.PhaseAdvanced) {
            expect(phaseEvents[0].phase).toBe("setup");
        }
        if (phaseEvents[1].type === PlanExecutionEventType.PhaseAdvanced) {
            expect(phaseEvents[1].phase).toBe("finish");
        }
    });

    it("emits failed for a plan that hits a fail instruction", async () => {
        const events: PlanExecutionEvent[] = [];
        const { adapter } = setupMultiPlan();
        (adapter as any).debug = {
            callbacks: {
                onPlanExecutionEvent: (event: PlanExecutionEvent) => {
                    events.push({ ...event });
                },
            },
        };
        initializeVivRuntime({
            contentBundle: multiPlanBundle,
            adapter,
        });
        await queuePlan({
            planName: "doomed",
            precastBindings: {
                agent: [AGENT_ID],
            },
        });
        await tickPlanner();
        // The last event should be failed
        const lastEvent = events[events.length - 1];
        expect(lastEvent.type).toBe(PlanExecutionEventType.Failed);
        if (lastEvent.type === PlanExecutionEventType.Failed) {
            expect(lastEvent.phase).toBe("attempt");
        }
    });

    it("emits blockedOnWait when a plan blocks on a wait instruction", async () => {
        const events: PlanExecutionEvent[] = [];
        const { adapter } = setupWaitPlan();
        (adapter as any).debug = {
            callbacks: {
                onPlanExecutionEvent: (event: PlanExecutionEvent) => {
                    events.push({ ...event });
                },
            },
        };
        initializeVivRuntime({
            contentBundle: waitPlanBundle,
            adapter,
        });
        await queuePlan({
            planName: "rest-plan",
            precastBindings: {
                patient: [PATIENT_ID],
            },
        });
        // Tick with timestamp 0 — the wait has a 3-day timeout, so it should block
        await tickPlanner();
        // Should see: launched, phaseAdvanced(resting), blockedOnWait
        const blockedEvent = events.find(
            event => event.type === PlanExecutionEventType.BlockedOnWait
        );
        expect(blockedEvent).toBeDefined();
        if (blockedEvent !== undefined && blockedEvent.type === PlanExecutionEventType.BlockedOnWait) {
            expect(blockedEvent.phase).toBe("resting");
            // 3 days = 3 * 24 * 60 = 4320 minutes from timestamp 0
            expect(blockedEvent.deadline).toBe(4320);
        }
    });

    it("emits blockedOnReactionWindow when a plan blocks on pending constructs", async () => {
        const events: PlanExecutionEvent[] = [];
        const { adapter } = setupReactionWindowPlan();
        (adapter as any).debug = {
            callbacks: {
                onPlanExecutionEvent: (event: PlanExecutionEvent) => {
                    events.push({ ...event });
                },
            },
        };
        initializeVivRuntime({
            contentBundle: reactionWindowBundle,
            adapter,
        });
        await queuePlan({
            planName: "parallel-tasks",
            precastBindings: {
                operator: [OPERATOR_ID],
            },
        });
        // Tick the planner — the plan queues two actions and blocks on the reaction window
        await tickPlanner();
        // Should see: launched, phaseAdvanced(dispatch), blockedOnReactionWindow
        const blockedEvent = events.find(
            event => event.type === PlanExecutionEventType.BlockedOnReactionWindow
        );
        expect(blockedEvent).toBeDefined();
        if (blockedEvent !== undefined && blockedEvent.type === PlanExecutionEventType.BlockedOnReactionWindow) {
            expect(blockedEvent.phase).toBe("dispatch");
            expect(blockedEvent.operator).toBe("all");
            expect(blockedEvent.queuedConstructs).toHaveLength(2);
        }
    });

    it("does not error when no callback is configured", async () => {
        const { adapter } = setupPlan();
        initializeVivRuntime({
            contentBundle: planBundle,
            adapter,
        });
        await queuePlan({
            planName: "scheme",
            precastBindings: {
                plotter: [PLOTTER_ID],
                target: [TARGET_ID],
            },
        });
        await expect(tickPlanner()).resolves.toBeUndefined();
    });
});
