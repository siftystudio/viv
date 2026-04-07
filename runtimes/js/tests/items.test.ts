/**
 * Tests for item inscription and inspection.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { attemptAction, initializeVivRuntime, selectAction } from "../src";
import { loadBundle, resetActionIDCounter } from "./fixtures/utils";
import { NOTE_ID, READER_ID, WRITER_ID, setup } from "./fixtures/action-with-items/setup";

const bundle = loadBundle("action-with-items");

describe("items", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    it("casts an item into an item role", async () => {
        const { state, adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        const result = await selectAction({ initiatorID: WRITER_ID });
        expect(result).not.toBeNull();
        const actionView = state.entities[state.actions[0]] as any;
        expect(actionView.name).toBe("write-note");
        expect(actionView.bindings.note).toContain(NOTE_ID);
    });

    it("inscription writes the action ID to the item's inscriptions array", async () => {
        const { state, adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        await selectAction({ initiatorID: WRITER_ID });
        const writeActionID = state.actions[0];
        const note = state.entities[NOTE_ID] as any;
        expect(note.inscriptions).toContain(writeActionID);
    });

    it("inspection transfers knowledge -- reader gains memory of inscribed action", async () => {
        const { state, adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        // First, write a note (inscribes the action onto the item)
        await selectAction({ initiatorID: WRITER_ID });
        const writeActionID = state.actions[0];
        // Now read the note (reader inspects the item, gaining knowledge)
        await attemptAction({
            actionName: "read-note",
            initiatorID: READER_ID,
            precastBindings: {
                reader: [READER_ID],
                note: [NOTE_ID],
            },
        });
        // The reader should now have a memory of the write-note action
        const reader = state.entities[READER_ID] as any;
        expect(reader.memories[writeActionID]).toBeDefined();
    });
});
