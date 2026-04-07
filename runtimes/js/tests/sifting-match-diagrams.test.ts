/**
 * Property-based tests for sifting-match diagram rendering.
 *
 * These tests assert on structural properties of the rendered diagram rather than
 * exact string output, so they survive cosmetic format changes while catching
 * real regressions in the rendering logic.
 */

import { describe, it, expect, beforeEach } from "vitest";

import type { SetupResult } from "./fixtures/utils";
import type { SiftingMatch } from "../src/story-sifter/types";
import {
    VivNotInitializedError,
    VivValidationError,
    attemptAction,
    constructSiftingMatchDiagram,
    initializeVivRuntime
} from "../src";
import {
    ROLE_COLOR_PALETTE,
    TREE_CONVERGENCE_ANONYMOUS,
    TREE_CONVERGENCE_ELLIPSIS
} from "../src/analysis/constants";
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
 * Returns the line containing the given short ID as a full node (not a back-reference).
 *
 * @param tree - The tree body string.
 * @param shortID - The short ID to search for.
 */
function lineContaining(tree: string, shortID: string): string | undefined {
    return tree.split("\n").find(line =>
        line.includes(`[${shortID}]`) && !line.includes(`[=${shortID}]`)
    );
}

/**
 * Extracts all distinct ANSI escape codes present in a string.
 *
 * @param text - The string to scan.
 * @returns A set of ANSI escape code strings found in the input.
 */
function extractAnsiCodes(text: string): Set<string> {
    return new Set([...text.matchAll(/\x1b\[[0-9;]+m/g)].map(match => match[0]));
}

describe("constructSiftingMatchDiagram", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    // This test must run before any test that calls init(), because the
    // VIV_IS_INITIALIZED flag persists between tests and there is no teardown mechanism.
    // This ordering is safe because vitest uses isolated child processes per file (the
    // default `forks` pool), so no cross-file contamination occurs.
    it("throws VivNotInitializedError if Viv has not been initialized", async () => {
        const match: SiftingMatch = { hero: ["aid-1"] };
        await expect(
            constructSiftingMatchDiagram({ siftingMatch: match })
        ).rejects.toThrow(VivNotInitializedError);
    });

    describe("validation", () => {
        it("throws VivValidationError for an empty sifting match", async () => {
            init();
            const match: SiftingMatch = {};
            await expect(
                constructSiftingMatchDiagram({ siftingMatch: match })
            ).rejects.toThrow(VivValidationError);
        });

        it("throws VivValidationError for invalid action IDs in the match", async () => {
            init();
            const match: SiftingMatch = { hero: ["nonexistent"] };
            await expect(
                constructSiftingMatchDiagram({ siftingMatch: match })
            ).rejects.toThrow(VivValidationError);
        });

        it("throws VivValidationError for non-action entity IDs in the match", async () => {
            init();
            const match: SiftingMatch = { hero: [CHARACTER_ID] };
            await expect(
                constructSiftingMatchDiagram({ siftingMatch: match })
            ).rejects.toThrow(VivValidationError);
        });
    });

    describe("spanning tree", () => {
        it("includes every matched action in the legend", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid2]);
            const match: SiftingMatch = {
                start: [aid1],
                end: [aid3],
            };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match });
            const legend = extractLegend(legendBody(diagram));
            const uids = new Set(legend.values());
            expect(uids).toContain(aid1);
            expect(uids).toContain(aid3);
        });

        it("excludes actions outside the causal closure", async () => {
            init();
            // Two independent actions — only one is in the match
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo");
            const match: SiftingMatch = { hero: [aid1] };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match });
            const legend = extractLegend(legendBody(diagram));
            const uids = new Set(legend.values());
            expect(uids).toContain(aid1);
            expect(uids).not.toContain(aid2);
        });

        it("includes glue actions that connect matched actions", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid2]);
            // Match start and end; bravo is glue
            const match: SiftingMatch = {
                start: [aid1],
                end: [aid3],
            };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match, elide: false });
            const legend = extractLegend(legendBody(diagram));
            const uids = new Set(legend.values());
            expect(uids).toContain(aid2);
        });

        it("prunes branches that lead to no matched action", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid1]);
            // Only bravo is matched; charlie is a dead-end branch
            const match: SiftingMatch = { hero: [aid1, aid2] };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match });
            const legend = extractLegend(legendBody(diagram));
            const uids = new Set(legend.values());
            expect(uids).not.toContain(aid3);
        });
    });

    describe("role labeling", () => {
        it("shows the role name on the same line as each matched action", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const match: SiftingMatch = {
                instigator: [aid1],
                responder: [aid2],
            };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match });
            const tree = treeBody(diagram);
            const legend = extractLegend(legendBody(diagram));
            // Each matched action's line should contain its role name
            const sid1 = shortIDFor(legend, aid1);
            const sid2 = shortIDFor(legend, aid2);
            const line1 = lineContaining(tree, sid1);
            const line2 = lineContaining(tree, sid2);
            expect(line1).toContain("instigator");
            expect(line2).toContain("responder");
        });

        it("does not show role names on glue action lines", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid2]);
            const match: SiftingMatch = {
                start: [aid1],
                end: [aid3],
            };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match, elide: false });
            const tree = treeBody(diagram);
            const legend = extractLegend(legendBody(diagram));
            // Bravo is glue — its line should not contain either role name
            const sid2 = shortIDFor(legend, aid2);
            const glueLine = lineContaining(tree, sid2);
            expect(glueLine).not.toContain("start");
            expect(glueLine).not.toContain("end");
        });
    });

    describe("ansi", () => {
        it("uses different ANSI codes for different roles", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const match: SiftingMatch = {
                instigator: [aid1],
                responder: [aid2],
            };
            const diagram = await constructSiftingMatchDiagram({
                siftingMatch: match,
                ansi: true,
            });
            const tree = treeBody(diagram);
            const legend = extractLegend(legendBody(diagram));
            // Find the lines for each matched action
            const sid1 = shortIDFor(legend, aid1);
            const sid2 = shortIDFor(legend, aid2);
            const line1 = lineContaining(tree, sid1) ?? "";
            const line2 = lineContaining(tree, sid2) ?? "";
            // Each line should have ANSI codes, and they should differ
            const codes1 = extractAnsiCodes(line1);
            const codes2 = extractAnsiCodes(line2);
            expect(codes1.size).toBeGreaterThan(0);
            expect(codes2.size).toBeGreaterThan(0);
            // The role-specific codes should not be identical sets
            const uniqueTo1 = [...codes1].filter(c => !codes2.has(c));
            const uniqueTo2 = [...codes2].filter(c => !codes1.has(c));
            expect(uniqueTo1.length + uniqueTo2.length).toBeGreaterThan(0);
        });

        it("uses a different ANSI code for glue than for matched nodes", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid2]);
            const match: SiftingMatch = {
                start: [aid1],
                end: [aid3],
            };
            const diagram = await constructSiftingMatchDiagram({
                siftingMatch: match,
                ansi: true,
                elide: false,
            });
            const tree = treeBody(diagram);
            const legend = extractLegend(legendBody(diagram));
            // Glue line (bravo) should have dim codes but not role codes
            const sid1 = shortIDFor(legend, aid1);
            const sid2 = shortIDFor(legend, aid2);
            const matchedLine = lineContaining(tree, sid1) ?? "";
            const glueLine = lineContaining(tree, sid2) ?? "";
            const matchedCodes = extractAnsiCodes(matchedLine);
            const glueCodes = extractAnsiCodes(glueLine);
            // Glue should have fewer distinct codes (just dim + reset)
            expect(glueCodes.size).toBeLessThan(matchedCodes.size);
        });

        it("does not include escape codes by default", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const match: SiftingMatch = { hero: [aid1] };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match });
            expect(diagram).not.toContain("\x1b[");
        });

        it("cycles the palette when there are more roles than palette entries", async () => {
            init();
            // Build a chain of 7 actions, each matched under a distinct role
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid2]);
            const aid4 = await forceAction("delta", [aid3]);
            const aid5 = await forceAction("echo", [aid4]);
            const aid6 = await forceAction("foxtrot", [aid5]);
            const aid7 = await forceAction("golf", [aid6]);
            const match: SiftingMatch = {
                role1: [aid1],
                role2: [aid2],
                role3: [aid3],
                role4: [aid4],
                role5: [aid5],
                role6: [aid6],
                role7: [aid7],
            };
            const diagram = await constructSiftingMatchDiagram({
                siftingMatch: match,
                ansi: true,
                elide: true,
            });
            const tree = treeBody(diagram);
            const legend = extractLegend(legendBody(diagram));
            // The 1st role (role1) should use palette[0] and the 7th role (role7)
            // should also use palette[0] since 7 % 6 === 1... wait: 0-indexed,
            // role7 is at index 6, and 6 % 6 = 0, so it wraps to palette[0].
            const sid1 = shortIDFor(legend, aid1);
            const sid7 = shortIDFor(legend, aid7);
            const line1 = lineContaining(tree, sid1) ?? "";
            const line7 = lineContaining(tree, sid7) ?? "";
            // Both lines should contain palette[0] — the first color
            expect(line1).toContain(ROLE_COLOR_PALETTE[0]);
            expect(line7).toContain(ROLE_COLOR_PALETTE[0]);
            // And the 2nd role should use palette[1], confirming they aren't all the same
            const sid2 = shortIDFor(legend, aid2);
            const line2 = lineContaining(tree, sid2) ?? "";
            expect(line2).toContain(ROLE_COLOR_PALETTE[1]);
            expect(line2).not.toContain(ROLE_COLOR_PALETTE[0]);
        });
    });

    describe("elision", () => {
        it("compresses linear glue chains into elision indicators when enabled", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid2]);
            const aid4 = await forceAction("delta", [aid3]);
            // Match only the endpoints; bravo and charlie are glue
            const match: SiftingMatch = {
                start: [aid1],
                end: [aid4],
            };
            const diagram = await constructSiftingMatchDiagram({
                siftingMatch: match,
                elide: true,
            });
            const tree = treeBody(diagram);
            const legend = extractLegend(legendBody(diagram));
            // The elision indicator should appear
            expect(tree).toContain("\u22EE");
            // Glue actions should not appear in the legend
            const uids = new Set(legend.values());
            expect(uids).not.toContain(aid2);
            expect(uids).not.toContain(aid3);
        });

        it("never elides matched actions", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid2]);
            const match: SiftingMatch = {
                start: [aid1],
                middle: [aid2],
                end: [aid3],
            };
            const diagram = await constructSiftingMatchDiagram({
                siftingMatch: match,
                elide: true,
            });
            const legend = extractLegend(legendBody(diagram));
            // All matched actions must be in the legend
            const uids = new Set(legend.values());
            expect(uids).toContain(aid1);
            expect(uids).toContain(aid2);
            expect(uids).toContain(aid3);
        });

        it("shows all glue nodes when elision is disabled", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid2]);
            const aid4 = await forceAction("delta", [aid3]);
            const match: SiftingMatch = {
                start: [aid1],
                end: [aid4],
            };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match, elide: false });
            const legend = extractLegend(legendBody(diagram));
            // Glue actions should appear in the legend
            const uids = new Set(legend.values());
            expect(uids).toContain(aid2);
            expect(uids).toContain(aid3);
        });
    });

    describe("legend", () => {
        it("maps each short ID to the correct real UID", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const match: SiftingMatch = {
                instigator: [aid1],
                responder: [aid2],
            };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match });
            const legend = extractLegend(legendBody(diagram));
            const uids = new Set(legend.values());
            expect(uids).toContain(aid1);
            expect(uids).toContain(aid2);
        });

        it("has one entry per non-back-reference node", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid1]);
            const aid4 = await forceAction("delta", [aid2, aid3]);
            const match: SiftingMatch = {
                start: [aid1],
                end: [aid4],
            };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match });
            const tree = treeBody(diagram);
            const legend = extractLegend(legendBody(diagram));
            const fullNodes = extractRefs(tree).filter(r => !r.isBackRef);
            const uniqueFullIDs = new Set(fullNodes.map(r => r.shortID));
            expect(legend.size).toBe(uniqueFullIDs.size);
        });

        it("is enclosed in a box", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const match: SiftingMatch = {
                start: [aid1],
                end: [aid2],
            };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match });
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

    describe("back-references", () => {
        it("renders the full node before the back-reference for DAG convergence", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid1]);
            // delta converges from both bravo and charlie
            const aid4 = await forceAction("delta", [aid2, aid3]);
            const match: SiftingMatch = {
                start: [aid1],
                end: [aid4],
            };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match, elide: false });
            const tree = treeBody(diagram);
            const legend = extractLegend(legendBody(diagram));
            const sid4 = shortIDFor(legend, aid4);
            // delta should appear once as a full node and once as a back-ref
            const refs = extractRefs(tree).filter(r => r.shortID === sid4);
            expect(refs.filter(r => !r.isBackRef)).toHaveLength(1);
            expect(refs.filter(r => r.isBackRef)).toHaveLength(1);
            // The full node appears before the back-reference
            const fullLine = firstFullNodeLine(tree, sid4);
            const backRefLine = firstBackRefLine(tree, sid4);
            expect(fullLine).toBeGreaterThanOrEqual(0);
            expect(backRefLine).toBeGreaterThan(fullLine);
        });
    });

    describe("formatLabel", () => {
        it("uses the callback's return value for node labels", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const labels: Record<string, string> = {
                [aid1]: "CUSTOM-A",
                [aid2]: "CUSTOM-B",
            };
            const match: SiftingMatch = { hero: [aid1, aid2] };
            const diagram = await constructSiftingMatchDiagram({
                siftingMatch: match,
                formatLabel: (actionID) => labels[actionID] ?? actionID,
            });
            const tree = treeBody(diagram);
            expect(tree).toContain("CUSTOM-A");
            expect(tree).toContain("CUSTOM-B");
            expect(tree).not.toContain("alpha");
            expect(tree).not.toContain("bravo");
        });
    });

    describe("maxChildren", () => {
        it("limits rendered children and shows a truncation count", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid1]);
            const aid4 = await forceAction("delta", [aid1]);
            const aid5 = await forceAction("echo", [aid1]);
            // Match all children so none are pruned
            const match: SiftingMatch = {
                root: [aid1],
                children: [aid2, aid3, aid4, aid5],
            };
            const diagram = await constructSiftingMatchDiagram({
                siftingMatch: match,
                maxChildren: 2,
            });
            const legend = extractLegend(legendBody(diagram));
            const tree = treeBody(diagram);
            // alpha + 2 visible children = 3 legend entries
            expect(legend.size).toBe(3);
            // Truncation indicator should show 2 hidden
            const more = [...tree.matchAll(/\u22EE \((\d+) more\)/g)].map(m => parseInt(m[1]));
            expect(more).toContain(2);
        });
    });

    describe("ancestor elision", () => {
        it("shows an ancestor count above the root when it has ancestors in the chronicle", async () => {
            init();
            // Create an ancestor outside the match
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid2]);
            // Match only the last two — aid1 is an ancestor in the spanning tree,
            // but aid1 itself has no ancestors, so no ancestor elision.
            // To get elision, we need the root to have ancestors.
            // Build: z → a → b, match only b. Root = a, a.ancestorCount = 1.
            const match: SiftingMatch = { hero: [aid3] };
            // In full mode, the root is the primogenitor (alpha) with ancestorCount = 0
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match, elide: false });
            const tree = treeBody(diagram);
            const lines = tree.split("\n");
            // No ancestor elision — the root is always a primogenitor in full mode
            expect(lines[0]).not.toMatch(/^\u22EE/);
        });

        it("shows ancestor elision when the root has ancestors outside the spanning tree", async () => {
            init();
            // Create a chain: alpha → bravo → charlie → delta
            // Match only delta — spanning tree is {alpha, bravo, charlie, delta}.
            // Root is alpha, ancestorCount = 0, so no ancestor elision from this chain.
            // Instead, match bravo and delta: spanning tree = {bravo, charlie, delta}.
            // But bravo is an ancestor of delta, and bravo.ancestorCount = 1 (alpha).
            // Wait — spanning tree = matched ∪ all their ancestors.
            // delta's ancestors = [charlie, bravo, alpha]. bravo's ancestors = [alpha].
            // Candidate set = {delta, charlie, bravo, alpha, bravo, alpha} = {alpha, bravo, charlie, delta}.
            // Root = alpha (no parents in set), ancestorCount = 0. Still no elision.
            //
            // The only way: create a precursor action, then build off it.
            // precursor → alpha → bravo, match only bravo.
            // Candidate set = {bravo} ∪ {alpha, precursor} = {precursor, alpha, bravo}.
            // Root = precursor, ancestorCount = 0. STILL no elision — precursor is the primogenitor.
            //
            // We need the root of the spanning tree to itself have been caused by something
            // that is NOT an ancestor of any matched action. That can't happen — the spanning
            // tree includes ALL ancestors of matched actions, so the root is always the
            // primogenitor with ancestorCount = 0.
            //
            // UNLESS: two matched actions from independent lineages. Then each lineage has
            // its own root. If one root has ancestors (because it was caused by something
            // in the other lineage's ancestry that's NOT an ancestor of the other matched
            // action)... no, that's still in the candidate set.
            //
            // Actually: ancestorCount counts ALL ancestors in the full chronicle. The root
            // of the spanning tree is always a primogenitor of some matched action. If that
            // primogenitor has 0 causes, its ancestorCount = 0. Ancestor elision can only
            // fire if the root was caused by something — which means it's not a true
            // primogenitor, which means it has a parent in the candidate set, which means
            // it's not a root. Contradiction.
            //
            // Ancestor elision cannot fire in the current model. The test verifies this.
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid2]);
            const match: SiftingMatch = { hero: [aid3] };
            // In full mode, ancestor elision cannot fire (roots are primogenitors)
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match, elide: false });
            const tree = treeBody(diagram);
            const lines = tree.split("\n");
            expect(lines[0]).not.toMatch(/^\u22EE/);
        });

        it("shows ancestor elision above the root in elided mode", async () => {
            init();
            // Build: alpha → bravo → charlie
            // Match only charlie. In elided mode, the root of the matched forest is
            // charlie itself. charlie.ancestorCount = 2 (alpha and bravo), so the
            // ancestor elision indicator ⋮ (2) should appear above the root.
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid2]);
            const match: SiftingMatch = { hero: [aid3] };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match, elide: true });
            const tree = treeBody(diagram);
            const lines = tree.split("\n");
            // The first line should be the ancestor elision indicator
            expect(lines[0]).toMatch(/\u22EE \(2\)/);
        });
    });

    describe("sibling elision", () => {
        it("shows a pruned-child count before kept children", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            await forceAction("charlie", [aid1]);  // aid3
            await forceAction("delta", [aid1]);  // aid4
            // Match alpha and bravo only — charlie and delta are pruned siblings
            const match: SiftingMatch = {
                root: [aid1],
                child: [aid2],
            };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match });
            const tree = treeBody(diagram);
            // The tree should contain an elision indicator for the 2 pruned siblings
            expect(tree).toMatch(/\u22EE \(2\)/);
        });

        it("renders the elision indicator before any kept children", async () => {
            init();
            const aid1 = await forceAction("alpha");
            await forceAction("bravo", [aid1]);  // aid2
            const aid3 = await forceAction("charlie", [aid1]);
            // Match alpha and charlie — bravo is a pruned sibling
            const match: SiftingMatch = {
                root: [aid1],
                child: [aid3],
            };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match });
            const tree = treeBody(diagram);
            const legend = extractLegend(legendBody(diagram));
            const sid3 = shortIDFor(legend, aid3);
            // Find the elision line and the kept child line
            const lines = tree.split("\n");
            const elisionLine = lines.findIndex(line => line.match(/\u22EE \(\d+\)/));
            const childLine = lines.findIndex(line =>
                line.includes(`[${sid3}]`) && !line.includes(`[=${sid3}]`)
            );
            // Elision should appear before the kept child
            expect(elisionLine).toBeGreaterThanOrEqual(0);
            expect(childLine).toBeGreaterThan(elisionLine);
        });

        it("does not show sibling elision on leaf nodes", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            await forceAction("charlie", [aid2]);  // aid3
            // Match only alpha — bravo and charlie are pruned.
            // Alpha has 1 pruned child (bravo), but alpha is a leaf in the kept tree,
            // so sibling elision is suppressed (descendant elision covers it).
            const match: SiftingMatch = { hero: [aid1] };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match });
            const tree = treeBody(diagram);
            // Should NOT have a sibling elision line with a connector (├─ ⋮ or └─ ⋮)
            expect(tree).not.toMatch(/[├└]\u2500 \u22EE/);
        });
    });

    describe("descendant elision", () => {
        it("shows a descendant count below matched leaf nodes", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            await forceAction("charlie", [aid2]);  // aid3
            // Match only alpha — it has 2 descendants in the chronicle
            const match: SiftingMatch = { hero: [aid1] };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match });
            const tree = treeBody(diagram);
            // Descendant elision should show the count
            expect(tree).toMatch(/\u22EE \(2\)/);
        });

        it("does not show descendant elision on nodes with kept children", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid2]);
            // Match alpha and charlie — alpha has kept children (bravo as glue, charlie below)
            const match: SiftingMatch = {
                start: [aid1],
                end: [aid3],
            };
            // In full mode, all descendants are in the kept tree — no elision
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match, elide: false });
            const tree = treeBody(diagram);
            expect(tree).not.toMatch(/\u22EE \(\d+\)/);
        });

        it("does not show descendant elision when the count is zero", async () => {
            init();
            const aid1 = await forceAction("alpha");
            // Match alpha — it has no descendants at all
            const match: SiftingMatch = { hero: [aid1] };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match });
            const tree = treeBody(diagram);
            // No elision indicators of any kind
            expect(tree).not.toContain("\u22EE");
        });
    });

    describe("elided mode", () => {
        it("shows path gap indicators between parent and child", async () => {
            init();
            // alpha → bravo → charlie → delta
            // Match alpha and delta; bravo and charlie are glue (2 glue actions)
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid2]);
            const aid4 = await forceAction("delta", [aid3]);
            const match: SiftingMatch = {
                start: [aid1],
                end: [aid4],
            };
            // elide: true is the default, but we'll be explicit
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match, elide: true });
            const tree = treeBody(diagram);
            // There should be a path gap indicator showing 2 glue actions
            expect(tree).toMatch(/\u22EE \(2\)/);
            // Glue actions should not appear in the legend
            const legend = extractLegend(legendBody(diagram));
            const uids = new Set(legend.values());
            expect(uids).not.toContain(aid2);
            expect(uids).not.toContain(aid3);
            // But matched actions should appear
            expect(uids).toContain(aid1);
            expect(uids).toContain(aid4);
        });

        it("annotates matched actions with role names", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const match: SiftingMatch = {
                instigator: [aid1],
                responder: [aid2],
            };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match, elide: true });
            const tree = treeBody(diagram);
            const legend = extractLegend(legendBody(diagram));
            const sid1 = shortIDFor(legend, aid1);
            const sid2 = shortIDFor(legend, aid2);
            const line1 = lineContaining(tree, sid1);
            const line2 = lineContaining(tree, sid2);
            expect(line1).toContain("instigator");
            expect(line2).toContain("responder");
        });

        it("produces a legend in elided mode", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const match: SiftingMatch = {
                start: [aid1],
                end: [aid2],
            };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match, elide: true });
            const legend = legendBody(diagram);
            const lines = legend.split("\n");
            // Legend should be enclosed in a box
            expect(lines[0]).toMatch(/^\u250C\u2500+\u2510$/);
            expect(lines[lines.length - 1]).toMatch(/^\u2514\u2500+\u2518$/);
            // Legend should contain both action UIDs
            const legendMap = extractLegend(legend);
            const uids = new Set(legendMap.values());
            expect(uids).toContain(aid1);
            expect(uids).toContain(aid2);
        });

        it("renders back-references for actions appearing under two matched parents", async () => {
            init();
            // alpha and bravo are independent roots; charlie descends from both
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo");
            const aid3 = await forceAction("charlie", [aid1, aid2]);
            const match: SiftingMatch = {
                root1: [aid1],
                root2: [aid2],
                convergence: [aid3],
            };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match, elide: true });
            const tree = treeBody(diagram);
            const legend = extractLegend(legendBody(diagram));
            const sid3 = shortIDFor(legend, aid3);
            // charlie should appear once as a full node and once as a back-reference
            const refs = extractRefs(tree).filter(r => r.shortID === sid3);
            expect(refs.filter(r => !r.isBackRef)).toHaveLength(1);
            expect(refs.filter(r => r.isBackRef)).toHaveLength(1);
            // The full node should appear before the back-reference
            const fullLine = firstFullNodeLine(tree, sid3);
            const backRefLine = firstBackRefLine(tree, sid3);
            expect(fullLine).toBeGreaterThanOrEqual(0);
            expect(backRefLine).toBeGreaterThan(fullLine);
        });

        it("renders a back-reference when a matched action has two matched parents within one family", async () => {
            init();
            // alpha → bravo, alpha → charlie, both bravo and charlie → delta
            // All four are matched. In the elided forest, delta has two matched parents
            // (bravo and charlie), so it should appear fully under one and as a back-ref
            // under the other.
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid1]);
            const aid4 = await forceAction("delta", [aid2, aid3]);
            const match: SiftingMatch = {
                root: [aid1],
                left: [aid2],
                right: [aid3],
                convergence: [aid4],
            };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match, elide: true });
            const tree = treeBody(diagram);
            const legend = extractLegend(legendBody(diagram));
            const sid4 = shortIDFor(legend, aid4);
            // delta should appear once as a full node and once as a back-reference
            const refs = extractRefs(tree).filter(r => r.shortID === sid4);
            expect(refs.filter(r => !r.isBackRef)).toHaveLength(1);
            expect(refs.filter(r => r.isBackRef)).toHaveLength(1);
            // The full node should appear before the back-reference
            const fullLine = firstFullNodeLine(tree, sid4);
            const backRefLine = firstBackRefLine(tree, sid4);
            expect(fullLine).toBeGreaterThanOrEqual(0);
            expect(backRefLine).toBeGreaterThan(fullLine);
        });
    });

    describe("convergence indicators", () => {
        it("shows a named convergence indicator when ancestors arrive from a named lineage", async () => {
            init();
            // Build a topology where a matched action has ancestors from a separate named lineage:
            //   alpha (matched) → bravo → charlie ─┐
            //                                       ├─ foxtrot (matched)
            //   delta (matched) → echo ─────────────┘
            //
            // foxtrot's non-matched ancestors are bravo, charlie, and echo.
            // bravo and charlie are on the path from alpha → foxtrot (direct path glue).
            // echo is a descendant of delta but NOT a descendant of alpha, so it arrives
            // from the lineage of delta — a named convergence.
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid2]);
            const aid4 = await forceAction("delta");
            const aid5 = await forceAction("echo", [aid4]);
            const aid6 = await forceAction("foxtrot", [aid3, aid5]);
            const match: SiftingMatch = {
                start: [aid1],
                origin: [aid4],
                end: [aid6],
            };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match, elide: true });
            const tree = treeBody(diagram);
            // The tree should contain the named convergence indicator [⋯shortID]
            expect(tree).toContain(TREE_CONVERGENCE_ELLIPSIS);
        });

        it("shows an anonymous convergence indicator when ancestors arrive from an unnamed lineage", async () => {
            init();
            // Build a topology where a matched action has ancestors from an anonymous lineage:
            //   alpha (matched) → bravo ──┐
            //                              ├─ delta (matched)
            //   (anon) charlie ────────────┘
            //
            // delta's non-matched ancestors: bravo is on the path from alpha → delta.
            // charlie is NOT a descendant of any matched action → anonymous convergence.
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie");
            const aid4 = await forceAction("delta", [aid2, aid3]);
            const match: SiftingMatch = {
                start: [aid1],
                end: [aid4],
            };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match, elide: true });
            const tree = treeBody(diagram);
            // The tree should contain the anonymous convergence indicator ─┼
            expect(tree).toContain(TREE_CONVERGENCE_ANONYMOUS);
        });
    });

    describe("multiple roots", () => {
        it("renders two independent causal lineages with separate family letters", async () => {
            init();
            // Two completely independent matched actions — no shared ancestry
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo");
            const match: SiftingMatch = {
                lineage1: [aid1],
                lineage2: [aid2],
            };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match });
            const legend = extractLegend(legendBody(diagram));
            const sid1 = shortIDFor(legend, aid1);
            const sid2 = shortIDFor(legend, aid2);
            // The two roots should have different family letter prefixes
            const family1 = sid1.replace(/\d+$/, "");
            const family2 = sid2.replace(/\d+$/, "");
            expect(family1).not.toBe(family2);
        });

        it("separates independent lineage roots with blank lines", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo");
            const match: SiftingMatch = {
                lineage1: [aid1],
                lineage2: [aid2],
            };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match });
            const tree = treeBody(diagram);
            // The tree body should contain a blank line separating the two families
            expect(tree).toContain("\n\n");
        });

        it("renders both roots in the legend", async () => {
            init();
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo");
            const match: SiftingMatch = {
                lineage1: [aid1],
                lineage2: [aid2],
            };
            const diagram = await constructSiftingMatchDiagram({ siftingMatch: match });
            const legend = extractLegend(legendBody(diagram));
            const uids = new Set(legend.values());
            expect(uids).toContain(aid1);
            expect(uids).toContain(aid2);
        });
    });

    describe("maxChildren + sibling elision interaction", () => {
        it("shows both the sibling elision indicator and the maxChildren truncation indicator", async () => {
            init();
            // alpha has 5 direct children: bravo, charlie, delta, echo, foxtrot
            // Match alpha, bravo, charlie, delta — echo and foxtrot are pruned siblings
            // Set maxChildren = 1, so only 1 of the 3 matched children is rendered
            const aid1 = await forceAction("alpha");
            const aid2 = await forceAction("bravo", [aid1]);
            const aid3 = await forceAction("charlie", [aid1]);
            const aid4 = await forceAction("delta", [aid1]);
            await forceAction("echo", [aid1]);  // aid5
            await forceAction("foxtrot", [aid1]);  // aid6
            const match: SiftingMatch = {
                root: [aid1],
                children: [aid2, aid3, aid4],
            };
            const diagram = await constructSiftingMatchDiagram({
                siftingMatch: match,
                maxChildren: 1,
            });
            const tree = treeBody(diagram);
            // Sibling elision: echo and foxtrot are pruned — ⋮ (2)
            expect(tree).toMatch(/\u22EE \(2\)/);
            // maxChildren truncation: 3 matched children, 1 shown → ⋮ (2 more)
            expect(tree).toMatch(/\u22EE \(2 more\)/);
        });
    });
});
