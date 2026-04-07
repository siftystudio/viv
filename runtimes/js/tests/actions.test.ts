/**
 * Tests for action selection (selectAction) and forced targeting (attemptAction).
 */

import { describe, it, expect, beforeEach } from "vitest";

import { initializeVivRuntime, selectAction, attemptAction, VivValidationError } from "../src";
import { loadBundle, resetActionIDCounter } from "./fixtures/utils";
import { setup as setupMinimal, CHARACTER_ID } from "./fixtures/minimal-action/setup";
import { setup as setupConditions, SPEAKER_ID, LISTENER_ID } from "./fixtures/action-with-conditions/setup";
import { setup as setupShuffled, WILLING_ID } from "./fixtures/shuffled-initiator/setup";

const minimalBundle = loadBundle("minimal-action");
const conditionsBundle = loadBundle("action-with-conditions");
const shuffledBundle = loadBundle("shuffled-initiator");

describe("selectAction", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    it("performs a minimal action when a single character is present", async () => {
        const { state, adapter } = setupMinimal();
        initializeVivRuntime({
            contentBundle: minimalBundle,
            adapter,
        });
        const result = await selectAction({ initiatorID: CHARACTER_ID });
        // An action should have been performed
        expect(result).not.toBeNull();
        // The chronicle should contain exactly one action
        expect(state.actions).toHaveLength(1);
        // The performed action should be "greet" with our character as initiator
        const actionView = state.entities[state.actions[0]] as any;
        expect(actionView.name).toBe("greet");
        expect(actionView.bindings.greeter).toContain(CHARACTER_ID);
    });

    it("returns null when conditions are not met", async () => {
        const { state, adapter } = setupConditions();
        // Set the speaker's mood to zero so the mood > 0 condition fails
        (state.entities[SPEAKER_ID] as any).mood = 0;
        initializeVivRuntime({
            contentBundle: conditionsBundle,
            adapter,
        });
        const result = await selectAction({ initiatorID: SPEAKER_ID });
        // No action should have been performed
        expect(result).toBeNull();
        expect(state.actions).toHaveLength(0);
    });

    it("performs an action when conditions are satisfied", async () => {
        const { state, adapter } = setupConditions();
        initializeVivRuntime({
            contentBundle: conditionsBundle,
            adapter,
        });
        const result = await selectAction({ initiatorID: SPEAKER_ID });
        // The confide action should have been performed
        expect(result).not.toBeNull();
        expect(state.actions).toHaveLength(1);
        const actionView = state.entities[state.actions[0]] as any;
        expect(actionView.name).toBe("confide");
    });

    it("rejects an invalid initiator ID", async () => {
        const { adapter } = setupMinimal();
        initializeVivRuntime({
            contentBundle: minimalBundle,
            adapter,
        });
        await expect(
            selectAction({ initiatorID: "nonexistent" })
        ).rejects.toThrow();
    });
});

describe("attemptAction", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    it("forces a specific action to be performed", async () => {
        const { state, adapter } = setupMinimal();
        initializeVivRuntime({
            contentBundle: minimalBundle,
            adapter,
        });
        const result = await attemptAction({
            actionName: "greet",
            initiatorID: CHARACTER_ID,
        });
        expect(result).not.toBeNull();
        expect(state.actions).toHaveLength(1);
        const actionView = state.entities[state.actions[0]] as any;
        expect(actionView.name).toBe("greet");
    });

    it("forces an action even when conditions fail if suppressConditions is set", async () => {
        const { state, adapter } = setupConditions();
        // Set the speaker's mood to zero so the condition would normally fail
        (state.entities[SPEAKER_ID] as any).mood = 0;
        initializeVivRuntime({
            contentBundle: conditionsBundle,
            adapter,
        });
        const result = await attemptAction({
            actionName: "confide",
            initiatorID: SPEAKER_ID,
            precastBindings: {
                speaker: [SPEAKER_ID],
                listener: [LISTENER_ID],
            },
            suppressConditions: true,
        });
        // The action should have been forced despite failing conditions
        expect(result).not.toBeNull();
        expect(state.actions).toHaveLength(1);
    });

    it("throws VivValidationError when precastBindings omits the initiator role", async () => {
        const { adapter } = setupConditions();
        initializeVivRuntime({
            contentBundle: conditionsBundle,
            adapter,
        });
        await expect(
            attemptAction({
                actionName: "confide",
                initiatorID: SPEAKER_ID,
                precastBindings: { listener: [LISTENER_ID] },
            })
        ).rejects.toThrow(VivValidationError);
    });

    it("discovers an eligible initiator from a shuffled pool when initiatorID is omitted", async () => {
        const { state, adapter } = setupShuffled();
        initializeVivRuntime({
            contentBundle: shuffledBundle,
            adapter,
        });
        const result = await attemptAction({ actionName: "volunteer" });
        // The action should have been performed by the only eligible character
        expect(result).not.toBeNull();
        expect(state.actions).toHaveLength(1);
        const actionView = state.entities[state.actions[0]] as any;
        expect(actionView.bindings.volunteer).toContain(WILLING_ID);
    });

    it("throws when the action name is unknown", async () => {
        const { adapter } = setupMinimal();
        initializeVivRuntime({
            contentBundle: minimalBundle,
            adapter,
        });
        await expect(
            attemptAction({
                actionName: "nonexistent",
                initiatorID: CHARACTER_ID,
            })
        ).rejects.toThrow("Cannot attempt action");
    });
});
