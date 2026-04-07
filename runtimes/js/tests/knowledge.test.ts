/**
 * Tests for memory formation and fading (knowledge manager).
 */

import { beforeEach, describe, expect, it } from "vitest";

import { attemptAction, fadeCharacterMemories, initializeVivRuntime } from "../src";
import { loadBundle, resetActionIDCounter } from "./fixtures/utils";
import { OBSERVER_ID, SUBJECT_ID, setup } from "./fixtures/action-with-saliences/setup";
import { PROPOSER_ID, RESPONDER_ID, setup as setupPerRoleSalience } from "./fixtures/saliences-per-role/setup";
import { BUYER_ID, SELLER_ID, setup as setupPerRoleAssoc } from "./fixtures/associations-per-role/setup";
import {
    ASSISTANT_ID, HONOREE_ID, OFFICIANT_ID, UNCAST_ID, WITNESS_ID, setup as setupCeremony,
} from "./fixtures/action-with-all-participation-modes/setup";
import { FOOL_ID, GOSSIPER_ID, LISTENER_ID, setup as setupRelay } from "./fixtures/knowledge-relay/setup";
import {
    ASSISTANT_ID as MV_ASSISTANT_ID,
    HONOREE_ID as MV_HONOREE_ID,
    OFFICIANT_ID as MV_OFFICIANT_ID,
    WITNESS_ID as MV_WITNESS_ID,
    setup as setupMemoryValues,
} from "./fixtures/memory-formation-values/setup";

const bundle = loadBundle("action-with-saliences");
const perRoleSalienceBundle = loadBundle("saliences-per-role");
const perRoleAssocBundle = loadBundle("associations-per-role");
const ceremonyBundle = loadBundle("action-with-all-participation-modes");
const relayBundle = loadBundle("knowledge-relay");
const memoryValuesBundle = loadBundle("memory-formation-values");

describe("knowledge", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    it("forms memories with the declared salience and associations", async () => {
        const { state, adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
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
        // Both characters should have a memory of the action
        const actionID = state.actions[0];
        const observerMemories = (state.entities[OBSERVER_ID] as any).memories;
        const subjectMemories = (state.entities[SUBJECT_ID] as any).memories;
        expect(observerMemories[actionID]).toBeDefined();
        expect(subjectMemories[actionID]).toBeDefined();
        // The declared salience is 5.0
        expect(observerMemories[actionID].salience).toBe(5.0);
        // Associations should include "notable"
        expect(observerMemories[actionID].associations).toContain("notable");
    });

    it("fades salience over elapsed time", async () => {
        const { state, adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
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
        const initialSalience = (state.entities[OBSERVER_ID] as any).memories[actionID].salience;
        // Advance time by one month (in minutes) and fade
        const minutesPerMonth = Math.floor((365 / 12) * 24 * 60);
        state.timestamp = minutesPerMonth;
        await fadeCharacterMemories();
        const fadedSalience = (state.entities[OBSERVER_ID] as any).memories[actionID].salience;
        // Salience should have decreased
        expect(fadedSalience).toBeLessThan(initialSalience);
        // With default retention multiplier of 0.9 and one month elapsed, salience should be ~4.5
        expect(fadedSalience).toBeCloseTo(initialSalience * 0.9, 1);
    });

    it("marks memories as forgotten when salience drops below threshold", async () => {
        const { state, adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
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
        // Advance time far enough for salience to drop below the default threshold (0.1)
        // With multiplier 0.9 per month and initial salience 5.0:
        // After n months: 5.0 * 0.9^n < 0.1  =>  n > log(0.02)/log(0.9) ≈ 37
        const minutesPerMonth = Math.floor((365 / 12) * 24 * 60);
        state.timestamp = minutesPerMonth * 40;
        await fadeCharacterMemories();
        const memory = (state.entities[OBSERVER_ID] as any).memories[actionID];
        expect(memory.forgotten).toBe(true);
    });
});

describe("per-role saliences", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("assigns different salience values per role", async () => {
        const { state, adapter } = setupPerRoleSalience();
        initializeVivRuntime({
            contentBundle: perRoleSalienceBundle,
            adapter,
        });
        await attemptAction({
            actionName: "negotiate",
            initiatorID: PROPOSER_ID,
            precastBindings: {
                proposer: [PROPOSER_ID],
                responder: [RESPONDER_ID],
            },
        });
        const actionID = state.actions[0];
        const proposerMemory = (state.entities[PROPOSER_ID] as any).memories[actionID];
        const responderMemory = (state.entities[RESPONDER_ID] as any).memories[actionID];
        // Proposer salience: 8.0, Responder salience: 2.0
        expect(proposerMemory.salience).toBe(8.0);
        expect(responderMemory.salience).toBe(2.0);
    });
});

describe("per-role associations", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("assigns different associations per role", async () => {
        const { state, adapter } = setupPerRoleAssoc();
        initializeVivRuntime({
            contentBundle: perRoleAssocBundle,
            adapter,
        });
        await attemptAction({
            actionName: "trade",
            initiatorID: SELLER_ID,
            precastBindings: {
                seller: [SELLER_ID],
                buyer: [BUYER_ID],
            },
        });
        const actionID = state.actions[0];
        const sellerMemory = (state.entities[SELLER_ID] as any).memories[actionID];
        const buyerMemory = (state.entities[BUYER_ID] as any).memories[actionID];
        expect(sellerMemory.associations).toContain("profitable");
        expect(buyerMemory.associations).toContain("expensive");
    });
});

describe("memory formation across participation modes", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("initiator forms a memory", async () => {
        const { state, adapter } = setupCeremony();
        initializeVivRuntime({
            contentBundle: ceremonyBundle,
            adapter,
        });
        await attemptAction({
            actionName: "ceremony",
            initiatorID: OFFICIANT_ID,
            precastBindings: {
                officiant: [OFFICIANT_ID],
                assistant: [ASSISTANT_ID],
                honoree: [HONOREE_ID],
                witness: [WITNESS_ID],
            },
        });
        const actionID = state.actions[0];
        expect((state.entities[OFFICIANT_ID] as any).memories[actionID]).toBeDefined();
    });

    it("partner forms a memory", async () => {
        const { state, adapter } = setupCeremony();
        initializeVivRuntime({
            contentBundle: ceremonyBundle,
            adapter,
        });
        await attemptAction({
            actionName: "ceremony",
            initiatorID: OFFICIANT_ID,
            precastBindings: {
                officiant: [OFFICIANT_ID],
                assistant: [ASSISTANT_ID],
                honoree: [HONOREE_ID],
                witness: [WITNESS_ID],
            },
        });
        const actionID = state.actions[0];
        expect((state.entities[ASSISTANT_ID] as any).memories[actionID]).toBeDefined();
    });

    it("recipient forms a memory", async () => {
        const { state, adapter } = setupCeremony();
        initializeVivRuntime({
            contentBundle: ceremonyBundle,
            adapter,
        });
        await attemptAction({
            actionName: "ceremony",
            initiatorID: OFFICIANT_ID,
            precastBindings: {
                officiant: [OFFICIANT_ID],
                assistant: [ASSISTANT_ID],
                honoree: [HONOREE_ID],
                witness: [WITNESS_ID],
            },
        });
        const actionID = state.actions[0];
        expect((state.entities[HONOREE_ID] as any).memories[actionID]).toBeDefined();
    });

    it("bystander forms a memory", async () => {
        const { state, adapter } = setupCeremony();
        initializeVivRuntime({
            contentBundle: ceremonyBundle,
            adapter,
        });
        await attemptAction({
            actionName: "ceremony",
            initiatorID: OFFICIANT_ID,
            precastBindings: {
                officiant: [OFFICIANT_ID],
                assistant: [ASSISTANT_ID],
                honoree: [HONOREE_ID],
                witness: [WITNESS_ID],
            },
        });
        const actionID = state.actions[0];
        expect((state.entities[WITNESS_ID] as any).memories[actionID]).toBeDefined();
    });

    it("uncast character at the same location does NOT form a memory", async () => {
        const { state, adapter } = setupCeremony();
        initializeVivRuntime({
            contentBundle: ceremonyBundle,
            adapter,
        });
        await attemptAction({
            actionName: "ceremony",
            initiatorID: OFFICIANT_ID,
            precastBindings: {
                officiant: [OFFICIANT_ID],
                assistant: [ASSISTANT_ID],
                honoree: [HONOREE_ID],
                witness: [WITNESS_ID],
            },
        });
        const actionID = state.actions[0];
        expect((state.entities[UNCAST_ID] as any).memories[actionID]).toBeUndefined();
    });
});

describe("knowledge relay via action roles", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("a character gains a memory of a past action through relay", async () => {
        const { state, adapter } = setupRelay();
        initializeVivRuntime({
            contentBundle: relayBundle,
            adapter,
        });
        // The fool acts a fool, with the gossiper witnessing
        await attemptAction({
            actionName: "act-a-fool",
            initiatorID: FOOL_ID,
            precastBindings: {
                fool: [FOOL_ID],
                witness: [GOSSIPER_ID],
            },
        });
        const incidentID = state.actions[0];
        // The listener was not present and has no memory of the incident
        expect((state.entities[LISTENER_ID] as any).memories[incidentID]).toBeUndefined();
        // The gossiper tells the listener about the incident, casting the
        // original action in an action role -- this triggers knowledge propagation
        await attemptAction({
            actionName: "gossip",
            initiatorID: GOSSIPER_ID,
            precastBindings: {
                gossiper: [GOSSIPER_ID],
                listener: [LISTENER_ID],
                incident: [incidentID],
            },
        });
        // The listener should now have a memory of the original incident
        const listenerMemory = (state.entities[LISTENER_ID] as any).memories[incidentID];
        expect(listenerMemory).toBeDefined();
        expect(listenerMemory.forgotten).toBe(false);
    });
});

describe("memory formation values across participation modes", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("records correct salience and associations for all participation modes", async () => {
        const { state, adapter } = setupMemoryValues();
        initializeVivRuntime({
            contentBundle: memoryValuesBundle,
            adapter,
        });
        await attemptAction({
            actionName: "ceremony",
            initiatorID: MV_OFFICIANT_ID,
            precastBindings: {
                officiant: [MV_OFFICIANT_ID],
                assistant: [MV_ASSISTANT_ID],
                honoree: [MV_HONOREE_ID],
                witness: [MV_WITNESS_ID],
            },
        });
        const actionID = state.actions[0];
        // All four participants should have salience 7.0 and association "memorable"
        for (const characterID of [MV_OFFICIANT_ID, MV_ASSISTANT_ID, MV_HONOREE_ID, MV_WITNESS_ID]) {
            const memory = (state.entities[characterID] as any).memories[actionID];
            expect(memory.salience).toBe(7.0);
            expect(memory.associations).toContain("memorable");
            expect(memory.forgotten).toBe(false);
        }
    });
});
