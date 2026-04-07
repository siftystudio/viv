/**
 * Tests for role casting mechanics: group roles, optional roles,
 * custom pools, symbol roles, tropes, and knowledge checks.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { attemptAction, initializeVivRuntime, selectAction } from "../src";
import { loadBundle, resetActionIDCounter } from "./fixtures/utils";
import { LEADER_ID, setup as setupGroup } from "./fixtures/action-with-group-roles/setup";
import { COMPANION_ID, WALKER_ID, setup as setupOptional } from "./fixtures/action-with-optional-roles/setup";
import { FRIEND_ID, SPEAKER_ID, STRANGER_ID, setup as setupPool } from "./fixtures/action-with-custom-pool/setup";
import { ACTOR_ID, setup as setupSymbol } from "./fixtures/action-with-symbol-roles/setup";
import {
    FRIEND_ID as TROPE_FRIEND_ID, STRANGER_ID as TROPE_STRANGER_ID, TELLER_ID, setup as setupTrope,
} from "./fixtures/action-with-trope/setup";
import {
    OBSERVER_ID, OUTSIDER_ID, setup as setupKnows,
} from "./fixtures/action-with-knowledge-check/setup";
import {
    ASSISTANT_ID, HONOREE_ID, OFFICIANT_ID, WITNESS_ID, setup as setupCeremony,
} from "./fixtures/action-with-all-participation-modes/setup";

const groupBundle = loadBundle("action-with-group-roles");
const optionalBundle = loadBundle("action-with-optional-roles");
const poolBundle = loadBundle("action-with-custom-pool");
const symbolBundle = loadBundle("action-with-symbol-roles");
const tropeBundle = loadBundle("action-with-trope");
const knowsBundle = loadBundle("action-with-knowledge-check");
const ceremonyBundle = loadBundle("action-with-all-participation-modes");

describe("group roles", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("binds multiple characters to a group role", async () => {
        const { state, adapter } = setupGroup();
        initializeVivRuntime({
            contentBundle: groupBundle,
            adapter,
        });
        const result = await selectAction({ initiatorID: LEADER_ID });
        expect(result).not.toBeNull();
        const actionView = state.entities[state.actions[0]] as any;
        // crowd should have 2-3 members
        expect(actionView.bindings.crowd.length).toBeGreaterThanOrEqual(2);
        expect(actionView.bindings.crowd.length).toBeLessThanOrEqual(3);
    });

    it("fails when not enough candidates for minimum", async () => {
        // Only leader + 1 member = not enough for min 2
        const { adapter } = setupGroup(1);
        initializeVivRuntime({
            contentBundle: groupBundle,
            adapter,
        });
        const result = await selectAction({ initiatorID: LEADER_ID });
        expect(result).toBeNull();
    });
});

describe("optional roles", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("succeeds with optional role filled", async () => {
        const { state, adapter } = setupOptional(true);
        initializeVivRuntime({
            contentBundle: optionalBundle,
            adapter,
        });
        const result = await selectAction({ initiatorID: WALKER_ID });
        expect(result).not.toBeNull();
        const actionView = state.entities[state.actions[0]] as any;
        expect(actionView.bindings.companion).toContain(COMPANION_ID);
    });

    it("succeeds with optional role empty", async () => {
        const { state, adapter } = setupOptional(false);
        initializeVivRuntime({
            contentBundle: optionalBundle,
            adapter,
        });
        const result = await selectAction({ initiatorID: WALKER_ID });
        expect(result).not.toBeNull();
        const actionView = state.entities[state.actions[0]] as any;
        expect(actionView.bindings.companion).toHaveLength(0);
    });

    it("conditional effect fires based on optional role presence", async () => {
        const { state, adapter } = setupOptional(true);
        initializeVivRuntime({
            contentBundle: optionalBundle,
            adapter,
        });
        await selectAction({ initiatorID: WALKER_ID });
        expect((state.entities[WALKER_ID] as any).companioned).toBe(true);
    });

    it("conditional effect takes else branch when optional role is absent", async () => {
        const { state, adapter } = setupOptional(false);
        initializeVivRuntime({
            contentBundle: optionalBundle,
            adapter,
        });
        await selectAction({ initiatorID: WALKER_ID });
        expect((state.entities[WALKER_ID] as any).companioned).toBe(false);
    });
});

describe("custom casting pool", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("casts only from the specified pool", async () => {
        const { state, adapter } = setupPool();
        initializeVivRuntime({
            contentBundle: poolBundle,
            adapter,
        });
        const result = await selectAction({ initiatorID: SPEAKER_ID });
        expect(result).not.toBeNull();
        const actionView = state.entities[state.actions[0]] as any;
        // Only FRIEND_ID is in the friends list
        expect(actionView.bindings.listener).toContain(FRIEND_ID);
        expect(actionView.bindings.listener).not.toContain(STRANGER_ID);
    });

    it("fails when pool is empty", async () => {
        const { adapter } = setupPool([]);
        initializeVivRuntime({
            contentBundle: poolBundle,
            adapter,
        });
        const result = await selectAction({ initiatorID: SPEAKER_ID });
        expect(result).toBeNull();
    });
});

describe("symbol roles", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("binds a literal value via precast symbol role", async () => {
        const { state, adapter } = setupSymbol();
        initializeVivRuntime({
            contentBundle: symbolBundle,
            adapter,
        });
        const result = await attemptAction({
            actionName: "label",
            initiatorID: ACTOR_ID,
            precastBindings: {
                actor: [ACTOR_ID],
                tag: ["hero"],
            },
        });
        expect(result).not.toBeNull();
        // The effect @actor.label = &tag should set label to "hero"
        expect((state.entities[ACTOR_ID] as any).label).toBe("hero");
    });
});

describe("trope fit", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("succeeds when trope condition holds", async () => {
        const { adapter } = setupTrope();
        initializeVivRuntime({
            contentBundle: tropeBundle,
            adapter,
        });
        const result = await attemptAction({
            actionName: "share-secret",
            initiatorID: TELLER_ID,
            precastBindings: {
                teller: [TELLER_ID],
                confidant: [TROPE_FRIEND_ID],
            },
        });
        expect(result).not.toBeNull();
    });

    it("fails when trope condition does not hold", async () => {
        const { adapter } = setupTrope();
        initializeVivRuntime({
            contentBundle: tropeBundle,
            adapter,
        });
        const result = await attemptAction({
            actionName: "share-secret",
            initiatorID: TELLER_ID,
            precastBindings: {
                teller: [TELLER_ID],
                confidant: [TROPE_STRANGER_ID],
            },
        });
        expect(result).toBeNull();
    });
});

describe("knowledge check (knows)", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("succeeds when character has memory of the action", async () => {
        const { state, adapter } = setupKnows();
        initializeVivRuntime({
            contentBundle: knowsBundle,
            adapter,
        });
        // First, perform the witness action to create a memory
        await selectAction({ initiatorID: OBSERVER_ID });
        const witnessActionID = state.actions[0];
        // Now attempt reminisce with the witnessed action
        const result = await attemptAction({
            actionName: "reminisce",
            initiatorID: OBSERVER_ID,
            precastBindings: {
                thinker: [OBSERVER_ID],
                "past-event": [witnessActionID],
            },
        });
        expect(result).not.toBeNull();
    });

    it("fails when character has no memory of the action", async () => {
        const { state, adapter } = setupKnows();
        initializeVivRuntime({
            contentBundle: knowsBundle,
            adapter,
        });
        // Perform witness — observer and subject participate, bystander does not
        await selectAction({ initiatorID: OBSERVER_ID });
        const witnessActionID = state.actions[0];
        // Bystander was not a participant, so has no memory
        const result = await attemptAction({
            actionName: "reminisce",
            initiatorID: OUTSIDER_ID,
            precastBindings: {
                thinker: [OUTSIDER_ID],
                "past-event": [witnessActionID],
            },
        });
        expect(result).toBeNull();
    });

    it("throws when precast binding references a nonexistent entity", async () => {
        const { adapter } = setupKnows();
        initializeVivRuntime({
            contentBundle: knowsBundle,
            adapter,
        });
        // "aid-nonexistent" is not a real entity — the role caster should throw
        await expect(attemptAction({
            actionName: "reminisce",
            initiatorID: OBSERVER_ID,
            precastBindings: {
                thinker: [OBSERVER_ID],
                "past-event": ["aid-nonexistent"],
            },
        })).rejects.toThrow();
    });
});

describe("duplicate entity invariant", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("throws when the same entity is precast in two different roles", async () => {
        const { adapter } = setupCeremony();
        initializeVivRuntime({
            contentBundle: ceremonyBundle,
            adapter,
        });
        await expect(attemptAction({
            actionName: "ceremony",
            initiatorID: OFFICIANT_ID,
            precastBindings: {
                officiant: [OFFICIANT_ID],
                assistant: [OFFICIANT_ID],
                honoree: [HONOREE_ID],
                witness: [WITNESS_ID],
            },
        })).rejects.toThrow("candidate appears in multiple roles");
    });

    it("throws when the same entity is precast twice in the same role", async () => {
        const { adapter } = setupCeremony();
        initializeVivRuntime({
            contentBundle: ceremonyBundle,
            adapter,
        });
        await expect(attemptAction({
            actionName: "ceremony",
            initiatorID: OFFICIANT_ID,
            precastBindings: {
                officiant: [OFFICIANT_ID],
                assistant: [ASSISTANT_ID],
                honoree: [HONOREE_ID, HONOREE_ID],
                witness: [WITNESS_ID],
            },
        })).rejects.toThrow("too many candidates");
    });
});
