/**
 * Core logic for building single-anchor causal tree diagrams.
 */

import type { UID } from "../adapter/types";
import type { CachedActionData, LinearChain, RenderContext } from "./types";
import { GATEWAY } from "../gateway";
import {
    TREE_ARROW_SEPARATOR,
    TREE_CONTENT_STYLE,
    TREE_FOCAL_STYLE,
    TREE_FRAME_STYLE,
    TREE_TRUNCATION_INDICATOR
} from "./constants";
import {
    assignShortID,
    fetchAndCache,
    formatBackRef,
    getCachedData,
    getFamilyLetter,
    getShortID,
    styled,
    walkDescendants
} from "./utils";

/**
 * Constructs a causal tree diagram anchored in the given action.
 *
 * @param anchorID - Entity ID for the anchor action.
 * @param formatLabel - Callback that produces the label for a given action, if any,
 *     else `null` to use the default (each node is the associated action name).
 * @param anchorMarker - The string used to mark the anchor in the diagram.
 * @param ansi - Whether to apply ANSI styling.
 * @param maxChildren - The maximum number of children to render per node.
 * @returns The constructed diagram as a string.
 */
export async function constructTreeDiagram(
    anchorID: UID,
    formatLabel: ((actionID: UID) => string) | null,
    anchorMarker: string,
    ansi: boolean,
    maxChildren: number
): Promise<string> {
    // Discover the full causal tree containing the anchor action
    const actionCache = new Map<UID, CachedActionData>();
    const roots = await discoverTree(anchorID, actionCache);
    // Set up the rendering context
    const renderContext: RenderContext = {
        actionCache,
        visited: new Map(),
        legend: [],
        anchorID,
        formatLabel: formatLabel ?? ((actionID: UID) => getCachedData(actionID, actionCache).name),
        anchorMarker,
        ansi,
        maxChildren,
        familyLetter: "",
        familyNodeCounter: 0,
    };
    // Render the DAG associated with each root
    const sections: string[] = [];
    for (let i = 0; i < roots.length; i++) {
        renderContext.familyLetter = getFamilyLetter(i);
        renderContext.familyNodeCounter = 1;
        sections.push(renderSubtree(roots[i], renderContext, "", true, true));
    }
    // Assemble the final output, complete with a legend
    const treeDiagram = sections.join("\n\n");
    const anchorShortID = renderContext.visited.get(anchorID) ?? null;
    const legend = renderLegend(renderContext.legend, anchorShortID, anchorMarker, ansi);
    const fullDiagram = `${treeDiagram}\n\n${legend}`;
    return fullDiagram;
}

/**
 * Discovers the full causal tree containing the anchor action, populating the action cache
 * with data for every action in the tree and returning the root action IDs.
 *
 * Note: The roots of the tree will be sorted in chronological order, thus producing
 * a loosely chronological layout through the diagram.
 *
 * @param anchorID - Entity ID for the anchor action.
 * @param actionCache - The cache to populate with action data.
 * @returns An array of root action IDs, sorted chronologically. Also mutates the `actionCache` in place.
 */
async function discoverTree(anchorID: UID, actionCache: Map<UID, CachedActionData>): Promise<UID[]> {
    // Cache the anchor and retrieve its ancestors
    await fetchAndCache(anchorID, actionCache);
    const ancestorIDs = await GATEWAY.getActionAncestors(anchorID);
    // Cache all ancestors in parallel
    await Promise.all(ancestorIDs.map(id => fetchAndCache(id, actionCache)));
    // Identify roots: ancestors with no causes (will be the anchor itself if it has no causes)
    const roots: UID[] = [];
    if (ancestorIDs.length === 0) {
        roots.push(anchorID);
    } else {
        for (const ancestorID of ancestorIDs) {
            const ancestorData = getCachedData(ancestorID, actionCache);
            if (ancestorData.causes.length === 0) {
                roots.push(ancestorID);
            }
        }
    }
    // Sort roots chronologically by their diegetic timestamp
    roots.sort((a, b) => getCachedData(a, actionCache).timestamp - getCachedData(b, actionCache).timestamp);
    // Walk down from each root to discover the full tree, including branches not in the
    // anchor's lineage. The ancestor phase only cached upward links, so we must walk
    // every node's `caused` links regardless of whether it is already cached.
    const discovered = new Set<UID>();
    for (const rootID of roots) {
        await walkDescendants(rootID, actionCache, discovered);
    }
    return roots;
}

/**
 * Recursively renders a subtree rooted at the given action.
 *
 * @param actionID - Entity ID for the action at the root of this subtree.
 * @param renderContext - The rendering context at hand.
 * @param prefix - The tree-drawing prefix for this line.
 * @param isRoot - Whether this node is a root of the forest.
 * @param isLast - Whether this node is the last child of its parent.
 * @returns The rendered subtree as a string.
 */
function renderSubtree(
    actionID: UID,
    renderContext: RenderContext,
    prefix: string,
    isRoot: boolean,
    isLast: boolean
): string {
    const connector = isRoot ? "" : (isLast ? "\u2514\u2500 " : "\u251C\u2500 ");
    const chrome = styled(prefix + connector, TREE_FRAME_STYLE, renderContext.ansi);
    // If this node was already rendered, emit a back-reference
    const existingShortID = renderContext.visited.get(actionID);
    if (existingShortID !== undefined) {
        return chrome + formatBackRef(renderContext.formatLabel(actionID), existingShortID, renderContext.ansi);
    }
    // Collect a terminal linear chain (non-branching action sequence) or fall back to a single node
    const { run, lastID, lastIsBackReference } = collectCollapsibleChain(actionID, renderContext);
    // Assign short IDs to all newly encountered nodes in the run
    for (const nodeID of run) {
        if (!renderContext.visited.has(nodeID)) {
            assignShortID(nodeID, renderContext);
        }
    }
    // Build and join fragments for each node in the run
    const fragments = run.map((nodeID, i) => {
        const isBackRef = i === run.length - 1 && lastIsBackReference;
        return formatNodeFragment(nodeID, isBackRef, renderContext);
    });
    const separator = styled(TREE_ARROW_SEPARATOR, TREE_FRAME_STYLE, renderContext.ansi);
    let result = chrome + fragments.join(separator);
    // Render children of the terminal node
    if (!lastIsBackReference) {
        result += renderChildren(lastID, renderContext, prefix, isRoot, isLast);
    }
    return result;
}

/**
 * Collects a collapsible chain starting at the given node.
 *
 * A collapsible chain is a sequence of single-child actions that ends in a leaf or
 * back-reference. If the candidate chain's terminal node has children to render, the
 * chain is discarded and a single-node chain is returned instead, since otherwise the
 * children would be indented under the first node in the chain, not their actual parent.
 *
 * @param actionID - Entity ID for the action that would constitute the head of the chain.
 * @param renderContext - The rendering context at hand.
 * @returns The collapsible chain.
 */
function collectCollapsibleChain(
    actionID: UID,
    renderContext: RenderContext
): LinearChain {
    const run = walkSingleChildPath(actionID, renderContext);
    const lastID = run[run.length - 1];
    const lastIsBackReference = renderContext.visited.has(lastID);
    // If the terminal node has children, discard the run so each node gets its own line
    if (!lastIsBackReference) {
        const terminusData = getCachedData(lastID, renderContext.actionCache);
        if (terminusData.caused.length > 0) {
            const linearChain: LinearChain = {
                run: [actionID],
                lastID: actionID,
                lastIsBackReference: false,
            };
            return linearChain;
        }
    }
    const linearChain: LinearChain = {
        run,
        lastID,
        lastIsBackReference,
    };
    return linearChain;
}

/**
 * Walks the single-child path starting at the given node, collecting action IDs
 * until the path branches, terminates, reaches the anchor, or hits a visited node.
 *
 * @param startID - Entity ID for the first action in the path.
 * @param renderContext - The rendering context at hand.
 * @returns An array of action IDs constituting the path.
 */
function walkSingleChildPath(startID: UID, renderContext: RenderContext): UID[] {
    const run: UID[] = [startID];
    // The anchor always stands alone
    if (startID === renderContext.anchorID) {
        return run;
    }
    let currentID = startID;
    while (true) {
        const data = getCachedData(currentID, renderContext.actionCache);
        if (data.caused.length !== 1) {
            break;
        }
        const nextID = data.caused[0];
        // Stop before the anchor (it gets its own line)
        if (nextID === renderContext.anchorID) {
            break;
        }
        // A previously visited node terminates the run as a back-reference
        if (renderContext.visited.has(nextID)) {
            run.push(nextID);
            break;
        }
        run.push(nextID);
        currentID = nextID;
    }
    return run;
}

/**
 * Formats a single node fragment for the diagram line.
 *
 * @param nodeID - Entity ID for the action node.
 * @param isBackRef - Whether this node is a back-reference at the end of a run.
 * @param renderContext - The rendering context at hand.
 * @returns The formatted fragment string.
 */
function formatNodeFragment(nodeID: UID, isBackRef: boolean, renderContext: RenderContext): string {
    const label = renderContext.formatLabel(nodeID);
    const shortID = getShortID(nodeID, renderContext);
    if (isBackRef) {
        return formatBackRef(label, shortID, renderContext.ansi);
    }
    if (nodeID === renderContext.anchorID) {
        const formattedNode =
            styled(renderContext.anchorMarker, TREE_FOCAL_STYLE, renderContext.ansi) + " "
            + styled(label, TREE_FOCAL_STYLE, renderContext.ansi) + " "
            + styled(`[${shortID}]`, TREE_FRAME_STYLE, renderContext.ansi);
        return formattedNode;
    }
    const formattedNode =
        styled(label, TREE_CONTENT_STYLE, renderContext.ansi)
        + " "
        + styled(`[${shortID}]`, TREE_FRAME_STYLE, renderContext.ansi);
    return formattedNode;
}

/**
 * Renders the children of the given node, if any, applying the `maxChildren` limit as applicable.
 *
 * @param parentID - Entity ID for the parent whose children will be rendered.
 * @param renderContext - The rendering context at hand.
 * @param prefix - The tree-drawing prefix for the parent line.
 * @param isRoot - Whether the parent is a root of the forest.
 * @param isLast - Whether the parent is the last child of its own parent.
 * @returns The rendered children of the given node as a string (including leading newlines),
 *     if it has children, else an empty string.
 */
function renderChildren(
    parentID: UID,
    renderContext: RenderContext,
    prefix: string,
    isRoot: boolean,
    isLast: boolean
): string {
    // If the parent has no children, return an empty string now
    const parentData = getCachedData(parentID, renderContext.actionCache);
    const children = parentData.caused;
    if (children.length === 0) {
        return "";
    }
    const childPrefix = isRoot ? "" : (prefix + (isLast ? "   " : "\u2502  "));
    let result = "";
    // Otherwise, apply the `maxChildren` limit, as applicable
    const visibleCount = Math.min(children.length, renderContext.maxChildren);
    const hiddenCount = children.length - visibleCount;
    for (let i = 0; i < visibleCount; i++) {
        const childIsLast = i === visibleCount - 1 && hiddenCount === 0;
        result += "\n" + renderSubtree(children[i], renderContext, childPrefix, false, childIsLast);
    }
    // If children were truncated, show an indicator
    if (hiddenCount > 0) {
        result += "\n" + styled(
            `${childPrefix}\u2514\u2500 ${TREE_TRUNCATION_INDICATOR} (${hiddenCount} more)`,
            TREE_FRAME_STYLE,
            renderContext.ansi
        );
    }
    return result;
}

/**
 * Renders the UID legend as a formatted string.
 *
 * The anchor action's entry is marked with its marker prefix so that searching for the
 * marker character highlights the anchor in both the tree body and the legend.
 *
 * @param legend - Array containing pairs of the form `[shortID, realUID]`,
 *     in the order they appear in the diagram.
 * @param anchorShortID - The short ID assigned to the anchor action, if any, else `null`.
 * @param anchorMarker - The marker string used to highlight the anchor.
 * @param ansi - Whether to apply ANSI styling to the legend.
 * @returns The formatted legend string.
 */
function renderLegend(
    legend: readonly [string, UID][],
    anchorShortID: string | null,
    anchorMarker: string,
    ansi: boolean
): string {
    // If the legend is empty, return an empty string now
    if (legend.length === 0) {
        return "";
    }
    // Prepend the marker to the anchor's display ID before computing column width
    const displayEntries = legend.map(([shortID, uid]) => {
        const isAnchor = shortID === anchorShortID;
        const displayID = isAnchor ? `${anchorMarker}${shortID}` : shortID;
        return {
            displayID,
            uid,
            isAnchor,
        };
    });
    // Align colons vertically, one space after the longest display ID
    const maxDisplayWidth = Math.max(...displayEntries.map(entry => entry.displayID.length));
    const rows = displayEntries.map(entry => {
        const idCode = entry.isAnchor ? TREE_FOCAL_STYLE : TREE_FRAME_STYLE;
        return styled(entry.displayID.padEnd(maxDisplayWidth), idCode, ansi)
            + " " + styled(":", TREE_FRAME_STYLE, ansi) + " " + entry.uid;
    });
    // Draw a box around the rows (compute width from unstyled content for alignment)
    const maxRowWidth = Math.max(...displayEntries.map(entry =>
        entry.displayID.padEnd(maxDisplayWidth).length + 3 + entry.uid.length
    ));
    const top = "\u250C\u2500" + "\u2500".repeat(maxRowWidth) + "\u2500\u2510";
    const bottom = "\u2514\u2500" + "\u2500".repeat(maxRowWidth) + "\u2500\u2518";
    // Pad each row to the max width (using unstyled length) and wrap in box borders
    const boxedRows = displayEntries.map((entry, i) => {
        const unstyledLength = entry.displayID.padEnd(maxDisplayWidth).length + 3 + entry.uid.length;
        const padding = " ".repeat(maxRowWidth - unstyledLength);
        return styled("\u2502", TREE_FRAME_STYLE, ansi) + " " + rows[i] + padding
            + " " + styled("\u2502", TREE_FRAME_STYLE, ansi);
    });
    const renderedLegend = [
        styled(top, TREE_FRAME_STYLE, ansi),
        ...boxedRows,
        styled(bottom, TREE_FRAME_STYLE, ansi),
    ].join("\n");
    return renderedLegend;
}
