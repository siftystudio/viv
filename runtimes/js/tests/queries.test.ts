/**
 * Tests for search query execution.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { attemptAction, initializeVivRuntime, runSearchQuery } from "../src";
import { loadBundle, resetActionIDCounter } from "./fixtures/utils";
import { OBSERVER_ID, SUBJECT_ID, setup } from "./fixtures/query/setup";
import { CHAR_A_ID, CHAR_B_ID, setup as setupName } from "./fixtures/query-by-action-name/setup";
import {
    ACTOR_ID as IMP_ACTOR_ID,
    WITNESS_ID as IMP_WITNESS_ID,
    setup as setupImportance,
} from "./fixtures/query-by-importance/setup";
import {
    ACTOR_ID as CHR_ACTOR_ID,
    WITNESS_ID as CHR_WITNESS_ID,
    setup as setupChronicle,
} from "./fixtures/query-over-chronicle/setup";

const bundle = loadBundle("query");
const nameBundle = loadBundle("query-by-action-name");
const importanceBundle = loadBundle("query-by-importance");
const chronicleBundle = loadBundle("query-over-chronicle");

describe("queries", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    it("matches memories by association tag", async () => {
        const { adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        // Perform the observe action (tagged "notable")
        await attemptAction({
            actionName: "observe",
            initiatorID: OBSERVER_ID,
            precastBindings: {
                observer: [OBSERVER_ID],
                subject: [SUBJECT_ID],
            },
        });
        // Query for notable memories over the observer's memory
        const matches = await runSearchQuery({
            queryName: "notable-memory",
            searchDomain: OBSERVER_ID,
        });
        expect(matches).toHaveLength(1);
    });

    it("excludes memories that lack the queried association", async () => {
        const { adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        // Perform the idle action (tagged "mundane", not "notable")
        await attemptAction({
            actionName: "idle",
            initiatorID: OBSERVER_ID,
            precastBindings: {
                idler: [OBSERVER_ID],
            },
        });
        // Query for notable memories -- should not match the "mundane" action
        const matches = await runSearchQuery({
            queryName: "notable-memory",
            searchDomain: OBSERVER_ID,
        });
        expect(matches).toHaveLength(0);
    });

    it("returns multiple matches when several actions qualify", async () => {
        const { adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        // Perform observe twice
        await attemptAction({
            actionName: "observe",
            initiatorID: OBSERVER_ID,
            precastBindings: {
                observer: [OBSERVER_ID],
                subject: [SUBJECT_ID],
            },
        });
        await attemptAction({
            actionName: "observe",
            initiatorID: OBSERVER_ID,
            precastBindings: {
                observer: [OBSERVER_ID],
                subject: [SUBJECT_ID],
            },
        });
        const matches = await runSearchQuery({
            queryName: "notable-memory",
            searchDomain: OBSERVER_ID,
        });
        expect(matches).toHaveLength(2);
    });

    it("respects the limit parameter", async () => {
        const { adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        // Perform observe twice
        await attemptAction({
            actionName: "observe",
            initiatorID: OBSERVER_ID,
            precastBindings: {
                observer: [OBSERVER_ID],
                subject: [SUBJECT_ID],
            },
        });
        await attemptAction({
            actionName: "observe",
            initiatorID: OBSERVER_ID,
            precastBindings: {
                observer: [OBSERVER_ID],
                subject: [SUBJECT_ID],
            },
        });
        const matches = await runSearchQuery({
            queryName: "notable-memory",
            searchDomain: OBSERVER_ID,
            limit: 1,
        });
        expect(matches).toHaveLength(1);
    });

    it("throws for an unknown query name", async () => {
        const { adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        await expect(
            runSearchQuery({ queryName: "nonexistent" })
        ).rejects.toThrow("Cannot run search query");
    });
});

describe("query by action name", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("returns only actions matching the name filter", async () => {
        const { adapter } = setupName();
        initializeVivRuntime({
            contentBundle: nameBundle,
            adapter,
        });
        // Perform greet and insult
        await attemptAction({
            actionName: "greet",
            initiatorID: CHAR_A_ID,
            precastBindings: {
                greeter: [CHAR_A_ID],
                target: [CHAR_B_ID],
            },
        });
        await attemptAction({
            actionName: "insult",
            initiatorID: CHAR_A_ID,
            precastBindings: {
                bully: [CHAR_A_ID],
                victim: [CHAR_B_ID],
            },
        });
        // Query for greet memories only
        const matches = await runSearchQuery({
            queryName: "greet-memories",
            searchDomain: CHAR_A_ID,
        });
        expect(matches).toHaveLength(1);
    });
});

describe("query by importance", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("returns only actions meeting the importance threshold", async () => {
        const { adapter } = setupImportance();
        initializeVivRuntime({
            contentBundle: importanceBundle,
            adapter,
        });
        // Perform both actions
        await attemptAction({
            actionName: "minor-event",
            initiatorID: IMP_ACTOR_ID,
            precastBindings: {
                actor: [IMP_ACTOR_ID],
                witness: [IMP_WITNESS_ID],
            },
        });
        await attemptAction({
            actionName: "major-event",
            initiatorID: IMP_ACTOR_ID,
            precastBindings: {
                actor: [IMP_ACTOR_ID],
                witness: [IMP_WITNESS_ID],
            },
        });
        // Query for important memories (importance >= 5)
        const matches = await runSearchQuery({
            queryName: "important-memories",
            searchDomain: IMP_ACTOR_ID,
        });
        // Only major-event (importance 8) should match
        expect(matches).toHaveLength(1);
    });
});

describe("query over chronicle", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("searches all actions in the chronicle", async () => {
        const { adapter } = setupChronicle();
        initializeVivRuntime({
            contentBundle: chronicleBundle,
            adapter,
        });
        // Perform the event action twice
        await attemptAction({
            actionName: "event",
            initiatorID: CHR_ACTOR_ID,
            precastBindings: {
                actor: [CHR_ACTOR_ID],
                witness: [CHR_WITNESS_ID],
            },
        });
        await attemptAction({
            actionName: "event",
            initiatorID: CHR_ACTOR_ID,
            precastBindings: {
                actor: [CHR_ACTOR_ID],
                witness: [CHR_WITNESS_ID],
            },
        });
        // Chronicle query -- no searchDomain means search the chronicle
        const matches = await runSearchQuery({ queryName: "chronicle-search" });
        expect(matches).toHaveLength(2);
    });
});

describe("query edge cases", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("returns empty array when character has no memories", async () => {
        const { adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        const matches = await runSearchQuery({
            queryName: "notable-memory",
            searchDomain: OBSERVER_ID,
        });
        expect(matches).toEqual([]);
    });
});
