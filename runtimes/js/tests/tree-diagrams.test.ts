/**
 * Property-based tests for causal tree rendering.
 *
 * These tests assert on structural properties of the rendered diagram rather than
 * exact string output, so they survive cosmetic format changes while catching
 * real regressions in the rendering logic.
 */

import { describe, it, expect, beforeEach } from "vitest";

import type { SetupResult } from "./fixtures/utils";
import {
    VivNotInitializedError,
    VivValidationError,
    attemptAction,
    constructTreeDiagram,
    initializeVivRuntime
} from "../src";
import { getFamilyLetter, styled } from "../src/analysis/utils";
import { TREE_CONTENT_STYLE, TREE_FRAME_STYLE, TREE_FOCAL_STYLE } from "../src/analysis/constants";
import { CHARACTER_ID, setup } from "./fixtures/causal-tree/setup";
import { loadBundle, resetActionIDCounter } from "./fixtures/utils";

const causalTreeBundle = loadBundle("causal-tree");

/**
 * Initializes the runtime with the causal-tree fixture.
 *
 * @returns The setup result containing the adapter and world state.
 */
function init(): SetupResult {
    const result = setup();
    initializeVivRuntime({
        contentBundle: causalTreeBundle,
        adapter: result.adapter,
    });
    return result;
}

/**
 * Forces an action and returns its entity ID.
 *
 * @param actionName - The name of the action to attempt.
 * @param causes - Optional array of cause action IDs.
 * @returns The entity ID of the newly created action.
 * @throws {Error} If the action attempt returns null.
 */
async function forceAction(actionName: string, causes?: string[]): Promise<string> {
    const result = await attemptAction({
        actionName,
        initiatorID: CHARACTER_ID,
        ...(causes !== undefined && { causes }),
    });
    if (result === null) {
        throw new Error(`attemptAction returned null for '${actionName}'`);
    }
    return result;
}

/**
 * Returns the tree portion of a rendered diagram (everything before the legend).
 *
 * @param diagram - The full rendered diagram string.
 * @returns The tree body, excluding the legend.
 */
function treeBody(diagram: string): string {
    const lastBlank = diagram.lastIndexOf("\n\n");
    return diagram.substring(0, lastBlank);
}

/**
 * Returns the legend portion of a rendered diagram (everything after the last blank line).
 *
 * @param diagram - The full rendered diagram string.
 * @returns The legend body.
 */
function legendBody(diagram: string): string {
    const lastBlank = diagram.lastIndexOf("\n\n");
    return diagram.substring(lastBlank + 2);
}

/**
 * A node reference extracted from the tree body.
 */
interface NodeRef {
    /**
     * The compact short ID (e.g., "a1", "b3").
     */
    readonly shortID: string;
    /**
     * Whether this is a back-reference (`[=id]`).
     */
    readonly isBackRef: boolean;
}

/**
 * Extracts all node references from the tree body.
 *
 * @param tree - The tree body string.
 * @returns An array of node references found in the tree.
 */
function extractRefs(tree: string): NodeRef[] {
    return [...tree.matchAll(/\[(=)?(\w+)\]/g)].map(match => ({
        shortID: match[2],
        isBackRef: match[1] === "=",
    }));
}

/**
 * Extracts the short ID of the anchor node (the one marked with a prefix before the label).
 *
 * Looks for any non-bracket, non-arrow content before a label that doesn't match the
 * normal unmarked pattern, identified by the `[shortID]` immediately following a known marker.
 * Falls back to finding the node whose line contains a marker character before the label.
 *
 * @param tree - The tree body string.
 * @param marker - The anchor marker character to search for.
 * @returns The anchor's short ID, or `null` if not found.
 */
function findAnchorShortID(tree: string, marker: string = "*"): string | null {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = tree.match(new RegExp(`${escaped} .+? \\[(\\w+)\\]`));
    return match ? match[1] : null;
}

/**
 * Strips ANSI escape codes from a string.
 *
 * @param text - The string to strip.
 * @returns The string with all ANSI escape codes removed.
 */
function stripAnsi(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Extracts legend entries as a map from short ID to real UID.
 *
 * Strips ANSI codes first so the regex works regardless of styling.
 *
 * @param legend - The legend portion of the diagram.
 * @returns A map from short IDs to real UIDs.
 */
function extractLegend(legend: string): Map<string, string> {
    const clean = stripAnsi(legend);
    const entries = new Map<string, string>();
    for (const match of clean.matchAll(/(\w+)\s*:\s+(\S+)/g)) {
        entries.set(match[1], match[2]);
    }
    return entries;
}

/**
 * Finds the short ID assigned to a real UID via the legend.
 *
 * @param legend - The legend map from short IDs to real UIDs.
 * @param uid - The real UID to look up.
 * @returns The short ID assigned to the given UID.
 * @throws {Error} If no legend entry exists for the given UID.
 */
function shortIDFor(legend: Map<string, string>, uid: string): string {
    for (const [shortID, realUID] of legend) {
        if (realUID === uid) {
            return shortID;
        }
    }
    throw new Error(`No legend entry for UID '${uid}'`);
}

/**
 * Returns true if two short IDs appear on the same line in the tree body.
 *
 * @param tree - The tree body string.
 * @param id1 - The first short ID.
 * @param id2 - The second short ID.
 */
function onSameLine(tree: string, id1: string, id2: string): boolean {
    return tree.split("\n").some(line => {
        const hasId1 = line.includes(`[${id1}]`) || line.includes(`[=${id1}]`);
        const hasId2 = line.includes(`[${id2}]`) || line.includes(`[=${id2}]`);
        return hasId1 && hasId2;
    });
}

/**
 * Returns the index of the first line where a short ID appears as a full node
 * (not a back-reference).
 *
 * @param tree - The tree body string.
 * @param shortID - The short ID to search for.
 */
function firstFullNodeLine(tree: string, shortID: string): number {
    return tree.split("\n").findIndex(line =>
        line.includes(`[${shortID}]`) && !line.includes(`[=${shortID}]`)
    );
}

/**
 * Returns the index of the first line where a short ID appears as a back-reference.
 *
 * @param tree - The tree body string.
 * @param shortID - The short ID to search for.
 */
function firstBackRefLine(tree: string, shortID: string): number {
    return tree.split("\n").findIndex(line => line.includes(`[=${shortID}]`));
}

/**
 * Extracts all truncation indicators from the tree body.
 *
 * @param tree - The tree body string.
 * @returns An object containing the parsed truncation counts.
 */
function extractTruncations(tree: string): { more: number[] } {
    const more = [...tree.matchAll(/\u22EE \((\d+) more\)/g)].map(match => parseInt(match[1]));
    return { more };
}

describe("getFamilyLetter", () => {
    it("maps single-letter indices correctly", () => {
        expect(getFamilyLetter(0)).toBe("a");
        expect(getFamilyLetter(1)).toBe("b");
        expect(getFamilyLetter(25)).toBe("z");
    });

    it("wraps into two-letter strings at index 26", () => {
        expect(getFamilyLetter(26)).toBe("aa");
        expect(getFamilyLetter(27)).toBe("ab");
    });

    it("wraps into three-letter strings at index 702", () => {
        expect(getFamilyLetter(702)).toBe("aaa");
    });

    it("produces consecutive results without gaps", () => {
        // Verify the boundary between single and double letters
        const letters = Array.from({ length: 30 }, (_, i) => getFamilyLetter(i));
        // First 26 should be single characters a-z
        for (let i = 0; i < 26; i++) {
            expect(letters[i]).toHaveLength(1);
        }
        // 26-29 should be two characters
        for (let i = 26; i < 30; i++) {
            expect(letters[i]).toHaveLength(2);
        }
    });
});

describe("styled", () => {
    it("wraps text in the given ANSI code when ansi is true", () => {
        const result = styled("hello", TREE_CONTENT_STYLE, true);
        expect(result).toBe(`${TREE_CONTENT_STYLE}hello\x1b[0m`);
    });

    it("returns the text unchanged when ansi is false", () => {
        const result = styled("hello", TREE_CONTENT_STYLE, false);
        expect(result).toBe("hello");
    });

    it("works with different style codes", () => {
        const frameResult = styled("frame", TREE_FRAME_STYLE, true);
        expect(frameResult).toBe(`${TREE_FRAME_STYLE}frame\x1b[0m`);
        const focalResult = styled("focal", TREE_FOCAL_STYLE, true);
        expect(focalResult).toBe(`${TREE_FOCAL_STYLE}focal\x1b[0m`);
    });

    it("handles empty strings", () => {
        expect(styled("", TREE_CONTENT_STYLE, true)).toBe(`${TREE_CONTENT_STYLE}\x1b[0m`);
        expect(styled("", TREE_CONTENT_STYLE, false)).toBe("");
    });
});

describe("constructTreeDiagram", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    // This test must run before any test that calls init(), because the
    // VIV_IS_INITIALIZED flag persists between tests and there is no teardown mechanism.
    // This ordering is safe because vitest uses isolated child processes per file (the
    // default `forks` pool), so no cross-file contamination occurs.
    it("throws VivNotInitializedError if Viv has not been initialized", async () => {
        await expect(
            constructTreeDiagram({ actionID: "aid-1" })
        ).rejects.toThrow(VivNotInitializedError);
    });

    describe("anchor", () => {
        it("marks exactly one node with * and it corresponds to the anchor action", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            await forceAction("charlie", [aid2]);  // aid3
            const diagram = await constructTreeDiagram({ actionID: aid2 });
            const tree = treeBody(diagram);
            const legend = extractLegend(legendBody(diagram));
            // Exactly one * in the tree
            const anchorMatches = tree.match(/\* /g);
            expect(anchorMatches).toHaveLength(1);
            // The anchor's short ID maps to the requested action
            const anchorShortID = findAnchorShortID(tree);
            expect(anchorShortID).not.toBeNull();
            expect(legend.get(anchorShortID as string)).toBe(aid2);
        });

        it("never renders the anchor as a back-reference", async () => {
            init();
            // Two paths converge on the anchor
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo");
            const aid3 = await forceAction("charlie", [aid1, aid2]);
            const diagram = await constructTreeDiagram({ actionID: aid3 });
            const tree = treeBody(diagram);
            const anchorShortID = findAnchorShortID(tree);
            // The anchor appears as a full node, and any subsequent reference is a back-ref,
            // but the anchor's FIRST appearance must be a full node with *
            const refs = extractRefs(tree).filter(r => r.shortID === anchorShortID);
            expect(refs[0].isBackRef).toBe(false);
        });

        it("gives the anchor its own line even in a linear chain", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid2]);
            const diagram = await constructTreeDiagram({ actionID: aid2 });
            const tree = treeBody(diagram);
            const legend = extractLegend(legendBody(diagram));
            const sid2 = shortIDFor(legend, aid2);
            // The anchor should NOT be on the same line as its parent or child
            const sid1 = shortIDFor(legend, aid1);
            const sid3 = shortIDFor(legend, aid3);
            expect(onSameLine(tree, sid1, sid2)).toBe(false);
            expect(onSameLine(tree, sid2, sid3)).toBe(false);
        });
    });

    describe("completeness", () => {
        it("includes every action in the causal tree", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid1]);
            const aid4 = await forceAction("delta", [aid2]);
            const diagram = await constructTreeDiagram({ actionID: aid1 });
            const legend = extractLegend(legendBody(diagram));
            // Every action UID appears in the legend
            const uids = [...legend.values()];
            expect(uids).toContain(aid1);
            expect(uids).toContain(aid2);
            expect(uids).toContain(aid3);
            expect(uids).toContain(aid4);
        });

        it("renders each action exactly once as a full node", async () => {
            init();
            const aid1 = await forceAction("alpha");
            await forceAction("bravo", [aid1]);  // aid2
            await forceAction("charlie", [aid1]);  // aid3
            const diagram = await constructTreeDiagram({ actionID: aid1 });
            const tree = treeBody(diagram);
            const refs = extractRefs(tree);
            const fullNodes = refs.filter(r => !r.isBackRef);
            // Each short ID appears exactly once as a full node
            const fullIDs = fullNodes.map(r => r.shortID);
            expect(new Set(fullIDs).size).toBe(fullIDs.length);
        });
    });

    describe("tail collapsing", () => {
        it("collapses terminal chains (ending in a leaf) into arrow runs", async () => {
            init();
            // alpha branches into bravo and charlie; bravo has a tail: delta → echo (both leaves)
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            await forceAction("charlie", [aid1]);  // aid3
            const aid4 = await forceAction("delta", [aid2]);
            const aid5 = await forceAction("echo", [aid4]);
            const diagram = await constructTreeDiagram({ actionID: aid1 });
            const tree = treeBody(diagram);
            const legend = extractLegend(legendBody(diagram));
            // delta and echo form a tail — they should be on the same line
            const sid4 = shortIDFor(legend, aid4);
            const sid5 = shortIDFor(legend, aid5);
            expect(onSameLine(tree, sid4, sid5)).toBe(true);
        });

        it("does not collapse chains whose terminal node has children", async () => {
            init();
            // alpha (anchor) → bravo → charlie, where charlie branches into delta and echo
            // bravo → charlie is NOT a tail because charlie has children to render below
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid2]);
            await forceAction("delta", [aid3]);  // aid4
            await forceAction("echo", [aid3]);  // aid5
            const diagram = await constructTreeDiagram({ actionID: aid1 });
            const tree = treeBody(diagram);
            const legend = extractLegend(legendBody(diagram));
            // bravo and charlie should NOT be on the same line (charlie branches)
            const sid2 = shortIDFor(legend, aid2);
            const sid3 = shortIDFor(legend, aid3);
            expect(onSameLine(tree, sid2, sid3)).toBe(false);
        });

        it("collapses terminal chains ending in a back-reference", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid1]);
            // delta is caused by both bravo and charlie
            const aid4 = await forceAction("delta", [aid2, aid3]);
            const diagram = await constructTreeDiagram({ actionID: aid1 });
            const tree = treeBody(diagram);
            const legend = extractLegend(legendBody(diagram));
            // charlie → delta[=] is a tail ending in a back-ref — should collapse
            const sid3 = shortIDFor(legend, aid3);
            const sid4 = shortIDFor(legend, aid4);
            expect(onSameLine(tree, sid3, sid4)).toBe(true);
        });
    });

    describe("back-references", () => {
        it("uses [=] for actions reached via multiple causal paths", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid1]);
            const aid4 = await forceAction("delta", [aid2, aid3]);
            const diagram = await constructTreeDiagram({ actionID: aid1 });
            const tree = treeBody(diagram);
            const legend = extractLegend(legendBody(diagram));
            const sid4 = shortIDFor(legend, aid4);
            // delta appears once as a full node and once as a back-ref
            const refs = extractRefs(tree).filter(r => r.shortID === sid4);
            expect(refs.filter(r => !r.isBackRef)).toHaveLength(1);
            expect(refs.filter(r => r.isBackRef)).toHaveLength(1);
        });

        it("always references a short ID that was rendered earlier", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid1]);
            const aid4 = await forceAction("delta", [aid2, aid3]);
            const diagram = await constructTreeDiagram({ actionID: aid1 });
            const tree = treeBody(diagram);
            const legend = extractLegend(legendBody(diagram));
            const sid4 = shortIDFor(legend, aid4);
            // The full node appears before the back-reference
            const fullLine = firstFullNodeLine(tree, sid4);
            const backRefLine = firstBackRefLine(tree, sid4);
            expect(fullLine).toBeGreaterThanOrEqual(0);
            expect(backRefLine).toBeGreaterThan(fullLine);
        });
    });

    describe("multiple roots", () => {
        it("uses different family letters for independent lineages", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo");
            const aid3 = await forceAction("charlie", [aid1, aid2]);
            const diagram = await constructTreeDiagram({ actionID: aid3 });
            const legend = extractLegend(legendBody(diagram));
            const sid1 = shortIDFor(legend, aid1);
            const sid2 = shortIDFor(legend, aid2);
            // The two roots should have different family letter prefixes
            const family1 = sid1.replace(/\d+$/, "");
            const family2 = sid2.replace(/\d+$/, "");
            expect(family1).not.toBe(family2);
        });

        it("separates roots with blank lines", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo");
            const aid3 = await forceAction("charlie", [aid1, aid2]);
            const diagram = await constructTreeDiagram({ actionID: aid3 });
            const tree = treeBody(diagram);
            // The tree body should contain a blank line separating the two families
            expect(tree).toContain("\n\n");
        });
    });

    describe("legend", () => {
        it("has one entry per non-back-reference node", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid1]);
            await forceAction("delta", [aid2, aid3]);  // aid4
            const diagram = await constructTreeDiagram({ actionID: aid1 });
            const tree = treeBody(diagram);
            const legend = extractLegend(legendBody(diagram));
            const fullNodes = extractRefs(tree).filter(r => !r.isBackRef);
            const uniqueFullIDs = new Set(fullNodes.map(r => r.shortID));
            expect(legend.size).toBe(uniqueFullIDs.size);
        });

        it("maps each short ID to the correct real UID", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const diagram = await constructTreeDiagram({ actionID: aid1 });
            const legend = extractLegend(legendBody(diagram));
            // The legend should contain both UIDs
            const uids = new Set(legend.values());
            expect(uids).toContain(aid1);
            expect(uids).toContain(aid2);
        });

        it("is enclosed in a box", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const diagram = await constructTreeDiagram({ actionID: aid1 });
            const legend = legendBody(diagram);
            const lines = legend.split("\n");
            // First line is the top border, last line is the bottom border
            expect(lines[0]).toMatch(/^\u250C\u2500+\u2510$/);
            expect(lines[lines.length - 1]).toMatch(/^\u2514\u2500+\u2518$/);
            // Inner lines are wrapped with │
            for (let i = 1; i < lines.length - 1; i++) {
                expect(lines[i]).toMatch(/^\u2502.*\u2502$/);
            }
        });
    });

    describe("anchorMarker", () => {
        it("uses the custom marker instead of the default", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const diagram = await constructTreeDiagram({
                actionID: aid1,
                anchorMarker: "\u25B6",
            });
            const tree = treeBody(diagram);
            expect(tree).toContain("\u25B6 alpha");
            expect(tree).not.toContain("* alpha");
        });
    });

    describe("maxChildren", () => {
        it("renders no more than maxChildren per node", async () => {
            init();
            const aid1 = await forceAction("alpha");
            await forceAction("bravo", [aid1]);  // aid2
            await forceAction("charlie", [aid1]);  // aid3
            await forceAction("delta", [aid1]);  // aid4
            await forceAction("echo", [aid1]);  // aid5
            const diagram = await constructTreeDiagram({
                actionID: aid1,
                maxChildren: 2,
            });
            const legend = extractLegend(legendBody(diagram));
            // alpha + 2 visible children = 3 legend entries
            expect(legend.size).toBe(3);
        });

        it("shows a count of hidden siblings", async () => {
            init();
            const aid1 = await forceAction("alpha");
            await forceAction("bravo", [aid1]);  // aid2
            await forceAction("charlie", [aid1]);  // aid3
            await forceAction("delta", [aid1]);  // aid4
            await forceAction("echo", [aid1]);  // aid5
            const diagram = await constructTreeDiagram({
                actionID: aid1,
                maxChildren: 2,
            });
            const tree = treeBody(diagram);
            const truncations = extractTruncations(tree);
            // 4 children, 2 shown → "2 more"
            expect(truncations.more).toContain(2);
        });
    });

    describe("formatLabel", () => {
        it("uses the callback's return value for node labels", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            // The callback receives UIDs; we map them to custom labels
            const labels: Record<string, string> = {
                [aid1]: "CUSTOM-A",
                [aid2]: "CUSTOM-B",
            };
            const diagram = await constructTreeDiagram({
                actionID: aid1,
                formatLabel: (actionID) => labels[actionID] ?? actionID,
            });
            const tree = treeBody(diagram);
            expect(tree).toContain("CUSTOM-A");
            expect(tree).toContain("CUSTOM-B");
            // Default action names should NOT appear
            expect(tree).not.toContain("alpha");
            expect(tree).not.toContain("bravo");
        });
    });

    describe("ansi", () => {
        it("applies color escape codes when enabled", async () => {
            init();
            const aid1 = await forceAction("alpha");
            await forceAction("bravo", [aid1]);  // aid2
            const diagram = await constructTreeDiagram({
                actionID: aid1,
                ansi: true,
            });
            const tree = treeBody(diagram);
            // Anchor should be styled with bright green
            expect(tree).toContain("\x1b[92m");
            // Non-anchor labels should be styled with cyan
            expect(tree).toContain("\x1b[36m");
            // Chrome should be dim
            expect(tree).toContain("\x1b[2m");
            // All codes should be reset
            expect(tree).toContain("\x1b[0m");
        });

        it("does not include escape codes by default", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const diagram = await constructTreeDiagram({ actionID: aid1 });
            const tree = treeBody(diagram);
            expect(tree).not.toContain("\x1b[");
        });
    });

    describe("validation", () => {
        it("throws VivValidationError for a nonexistent entity ID", async () => {
            init();
            await expect(
                constructTreeDiagram({ actionID: "nonexistent" })
            ).rejects.toThrow(VivValidationError);
        });

        it("throws VivValidationError for an entity that is not an action", async () => {
            init();
            await expect(
                constructTreeDiagram({ actionID: CHARACTER_ID })
            ).rejects.toThrow(VivValidationError);
        });
    });
});
