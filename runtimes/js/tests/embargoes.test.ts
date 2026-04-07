/**
 * Tests for embargo enforcement.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { attemptAction, initializeVivRuntime, selectAction } from "../src";
import { loadBundle, resetActionIDCounter } from "./fixtures/utils";
import { SPEAKER_ID, setup } from "./fixtures/action-with-embargoes/setup";
import { SPEAKER_ID as TIME_SPEAKER_ID, setup as setupTime } from "./fixtures/action-with-embargo-time/setup";
import { HERALD_ID, LOCATION_B_ID, setup as setupAnywhere } from "./fixtures/action-with-embargo-anywhere/setup";
import { CHAR_A_ID, CHAR_B_ID, CHAR_C_ID, setup as setupRoles } from "./fixtures/action-with-embargo-roles/setup";

const bundle = loadBundle("action-with-embargoes");
const timeBundle = loadBundle("action-with-embargo-time");
const anywhereBundle = loadBundle("action-with-embargo-anywhere");
const rolesBundle = loadBundle("action-with-embargo-roles");

describe("embargoes", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    it("allows the first performance of an embargoed action", async () => {
        const { state, adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        const result = await selectAction({ initiatorID: SPEAKER_ID });
        // The first performance should succeed
        expect(result).not.toBeNull();
        expect(state.actions).toHaveLength(1);
    });

    it("blocks a second performance at the same location due to permanent embargo", async () => {
        const { state, adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        // First performance should succeed
        await selectAction({ initiatorID: SPEAKER_ID });
        expect(state.actions).toHaveLength(1);
        // Second performance at the same location should be blocked by the embargo
        const result = await selectAction({ initiatorID: SPEAKER_ID });
        expect(result).toBeNull();
        // Only one action in the chronicle
        expect(state.actions).toHaveLength(1);
    });
});

describe("time-limited embargoes", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("blocks re-performance within the embargo period", async () => {
        const { state, adapter } = setupTime();
        initializeVivRuntime({
            contentBundle: timeBundle,
            adapter,
        });
        await selectAction({ initiatorID: TIME_SPEAKER_ID });
        expect(state.actions).toHaveLength(1);
        // Still within 30-minute window
        state.timestamp = 15;
        const result = await selectAction({ initiatorID: TIME_SPEAKER_ID });
        expect(result).toBeNull();
    });

    it("allows re-performance after the embargo period expires", async () => {
        const { state, adapter } = setupTime();
        initializeVivRuntime({
            contentBundle: timeBundle,
            adapter,
        });
        await selectAction({ initiatorID: TIME_SPEAKER_ID });
        expect(state.actions).toHaveLength(1);
        // Advance past the 30-minute embargo
        state.timestamp = 31;
        const result = await selectAction({ initiatorID: TIME_SPEAKER_ID });
        expect(result).not.toBeNull();
        expect(state.actions).toHaveLength(2);
    });
});

describe("anywhere embargoes", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("blocks re-performance even at a different location", async () => {
        const { state, adapter } = setupAnywhere();
        initializeVivRuntime({
            contentBundle: anywhereBundle,
            adapter,
        });
        await selectAction({ initiatorID: HERALD_ID });
        expect(state.actions).toHaveLength(1);
        // Move character to a different location
        (state.entities[HERALD_ID] as any).location = LOCATION_B_ID;
        const result = await selectAction({ initiatorID: HERALD_ID });
        expect(result).toBeNull();
    });
});

describe("role-scoped embargoes", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("blocks re-performance with the same role bindings", async () => {
        const { state, adapter } = setupRoles();
        initializeVivRuntime({
            contentBundle: rolesBundle,
            adapter,
        });
        await attemptAction({
            actionName: "duel",
            initiatorID: CHAR_A_ID,
            precastBindings: {
                challenger: [CHAR_A_ID],
                opponent: [CHAR_B_ID],
            },
        });
        expect(state.actions).toHaveLength(1);
        // Same pairing should be blocked
        const result = await attemptAction({
            actionName: "duel",
            initiatorID: CHAR_A_ID,
            precastBindings: {
                challenger: [CHAR_A_ID],
                opponent: [CHAR_B_ID],
            },
        });
        expect(result).toBeNull();
    });

    it("allows performance with different role bindings", async () => {
        const { state, adapter } = setupRoles();
        initializeVivRuntime({
            contentBundle: rolesBundle,
            adapter,
        });
        await attemptAction({
            actionName: "duel",
            initiatorID: CHAR_A_ID,
            precastBindings: {
                challenger: [CHAR_A_ID],
                opponent: [CHAR_B_ID],
            },
        });
        expect(state.actions).toHaveLength(1);
        // Different opponent should be allowed
        const result = await attemptAction({
            actionName: "duel",
            initiatorID: CHAR_A_ID,
            precastBindings: {
                challenger: [CHAR_A_ID],
                opponent: [CHAR_C_ID],
            },
        });
        expect(result).not.toBeNull();
        expect(state.actions).toHaveLength(2);
    });
});

describe("embargo expiration timing", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("embargo holds at exactly the expiration timestamp", async () => {
        const { state, adapter } = setupTime();
        initializeVivRuntime({
            contentBundle: timeBundle,
            adapter,
        });
        await selectAction({ initiatorID: TIME_SPEAKER_ID });
        state.timestamp = 30;
        const result = await selectAction({ initiatorID: TIME_SPEAKER_ID });
        expect(result).toBeNull();
    });

    it("embargo expires one tick after the expiration timestamp", async () => {
        const { state, adapter } = setupTime();
        initializeVivRuntime({
            contentBundle: timeBundle,
            adapter,
        });
        await selectAction({ initiatorID: TIME_SPEAKER_ID });
        state.timestamp = 31;
        const result = await selectAction({ initiatorID: TIME_SPEAKER_ID });
        expect(result).not.toBeNull();
    });

    it("performing action again after expiry imposes a fresh embargo", async () => {
        const { state, adapter } = setupTime();
        initializeVivRuntime({
            contentBundle: timeBundle,
            adapter,
        });
        await selectAction({ initiatorID: TIME_SPEAKER_ID });
        state.timestamp = 31;
        await selectAction({ initiatorID: TIME_SPEAKER_ID });
        expect(state.actions).toHaveLength(2);
        // Within the new embargo's window (31+30=61)
        state.timestamp = 45;
        expect(await selectAction({ initiatorID: TIME_SPEAKER_ID })).toBeNull();
        // Past the new embargo
        state.timestamp = 62;
        expect(await selectAction({ initiatorID: TIME_SPEAKER_ID })).not.toBeNull();
        expect(state.actions).toHaveLength(3);
    });
});
