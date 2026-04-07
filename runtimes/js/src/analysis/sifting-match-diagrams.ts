/**
 * Core logic for building sifting-match causal tree diagrams.
 *
 * These diagrams visualize the result of a sifting pattern match
 * by rendering the minimal causal tree connecting all matched
 * actions, with role-aware highlighting and optional glue elision.
 */

import type { UID } from "../adapter/types";
import type { RoleName } from "../content-bundle/types";
import type { SiftingMatch } from "../story-sifter/types";
import type {
    CachedActionData,
    ClassifiedNode,
    ElideNodeData,
    ElidedRenderContext,
    LinearChain,
    MatchedForestNode,
    SiftingMatchRenderContext
} from "./types";
import { GATEWAY } from "../gateway";
import { getActionView } from "../utils";
import {
    ROLE_COLOR_PALETTE,
    TREE_ARROW_SEPARATOR,
    TREE_CONTENT_STYLE,
    TREE_CONVERGENCE_ANONYMOUS,
    TREE_CONVERGENCE_ELLIPSIS,
    TREE_FRAME_STYLE,
    TREE_GLUE_STYLE,
    TREE_TRUNCATION_INDICATOR,
    NodeClassification
} from "./constants";
import {
    assignShortID,
    fetchAndCache,
    formatBackRef,
    getCachedData,
    getFamilyLetter,
    getShortID,
    styled
} from "./utils";

/**
 * Constructs a sifting-match diagram from the given sifting match.
 *
 * @param siftingMatch - The sifting match to visualize.
 * @param formatLabel - Callback that produces the label for a given action, if any,
 *     else `null` to use the default (each node is the associated action name).
 * @param ansi - Whether to apply ANSI styling.
 * @param maxChildren - The maximum number of children to render per node.
 * @param elide - Whether to compress linear glue chains into elision indicators.
 * @returns The constructed diagram as a string.
 */
export async function constructSiftingMatchDiagram(
    siftingMatch: SiftingMatch,
    formatLabel: ((actionID: UID) => string) | null,
    ansi: boolean,
    maxChildren: number,
    elide: boolean
): Promise<string> {
    // Flatten the sifting match into lookup structures
    const matchedActionIDs = new Set<UID>();
    const actionToRole = new Map<UID, RoleName>();
    for (const roleName of Object.keys(siftingMatch)) {
        for (const actionID of siftingMatch[roleName]) {
            matchedActionIDs.add(actionID);
            // If an action appears in multiple roles, the first role wins
            if (!actionToRole.has(actionID)) {
                actionToRole.set(actionID, roleName);
            }
        }
    }
    // Assign a color to each role
    const roleNames = Object.keys(siftingMatch);
    const roleColorMap = new Map<RoleName, string>();
    for (let i = 0; i < roleNames.length; i++) {
        roleColorMap.set(roleNames[i], ROLE_COLOR_PALETTE[i % ROLE_COLOR_PALETTE.length]);
    }
    // In elided mode, dispatch to a separate pipeline that fetches only matched actions
    if (elide) {
        return await constructElidedDiagram(
            matchedActionIDs, actionToRole, roleColorMap, formatLabel, ansi, maxChildren
        );
    }
    // Otherwise, discover the full spanning tree and classify its nodes
    const actionCache = new Map<UID, CachedActionData>();
    const candidateSet = await discoverSpanningTree(matchedActionIDs, actionCache);
    const { classifiedTree, roots } = classifyTree(candidateSet, matchedActionIDs, actionToRole, actionCache);
    // Set up the rendering context
    const renderContext: SiftingMatchRenderContext = {
        actionCache,
        classifiedTree,
        roleColorMap,
        visited: new Map(),
        legend: [],
        formatLabel: formatLabel ?? ((actionID: UID) => getCachedData(actionID, actionCache).name),
        ansi,
        maxChildren,
        familyLetter: "",
        familyNodeCounter: 0,
    };
    // Render the DAG associated with each root, with ancestor elision above each
    const sections: string[] = [];
    for (let i = 0; i < roots.length; i++) {
        renderContext.familyLetter = getFamilyLetter(i);
        renderContext.familyNodeCounter = 1;
        const ancestorPrefix = renderAncestorElision(roots[i], actionCache, ansi);
        sections.push(ancestorPrefix + renderSubtree(roots[i], renderContext, "", true, true));
    }
    // Assemble the final output, complete with a role-grouped legend
    const treeDiagram = sections.join("\n\n");
    const legend = renderLegend(renderContext.legend, ansi);
    const fullDiagram = `${treeDiagram}\n\n${legend}`;
    return fullDiagram;
}

/**
 * Discovers the minimal spanning tree connecting all matched actions.
 *
 * The spanning tree is the union of all matched actions and all of their ancestors. No
 * descendant walk is needed, since the minimal tree is fully determined by shared ancestry.
 *
 * @param matchedActionIDs - The set of all matched action IDs.
 * @param actionCache - The cache to populate with action data.
 * @returns The set of all action IDs in the candidate spanning tree.
 */
async function discoverSpanningTree(
    matchedActionIDs: Set<UID>,
    actionCache: Map<UID, CachedActionData>
): Promise<Set<UID>> {
    const candidateSet = new Set<UID>();
    // Fetch each matched action and all of its ancestors
    for (const actionID of matchedActionIDs) {
        await fetchAndCache(actionID, actionCache);
        candidateSet.add(actionID);
        const ancestorIDs = await GATEWAY.getActionAncestors(actionID);
        await Promise.all(ancestorIDs.map(async (ancestorID) => {
            await fetchAndCache(ancestorID, actionCache);
            candidateSet.add(ancestorID);
        }));
    }
    return candidateSet;
}

/**
 * Classifies every node in the candidate set as matched, glue, or pruned via a bottom-up
 * DFS pass, and returns the classified tree along with the chronologically sorted root IDs.
 *
 * @param candidateSet - The set of all action IDs in the spanning tree.
 * @param matchedActionIDs - The set of matched action IDs from the sifting result.
 * @param actionToRole - A mapping from matched action IDs to their role names.
 * @param actionCache - The action data cache.
 * @returns The classified tree and the root action IDs.
 */
function classifyTree(
    candidateSet: Set<UID>,
    matchedActionIDs: Set<UID>,
    actionToRole: Map<UID, RoleName>,
    actionCache: Map<UID, CachedActionData>
): { classifiedTree: Map<UID, ClassifiedNode>; roots: UID[] } {
    const classifiedTree = new Map<UID, ClassifiedNode>();
    // Identify roots (nodes with no parent in the candidate set)
    const roots: UID[] = [];
    for (const actionID of candidateSet) {
        const data = getCachedData(actionID, actionCache);
        const hasParentInSet = data.causes.some(causeID => candidateSet.has(causeID));
        if (!hasParentInSet) {
            roots.push(actionID);
        }
    }
    // Sort roots chronologically
    roots.sort((a, b) => getCachedData(a, actionCache).timestamp - getCachedData(b, actionCache).timestamp);
    // Classify from each root (the recursion handles the full subtree)
    for (const rootID of roots) {
        classifyNode(rootID, candidateSet, matchedActionIDs, actionToRole, actionCache, classifiedTree);
    }
    // Remove pruned roots
    const keptRoots = roots.filter(id => {
        const node = classifiedTree.get(id);
        return node !== undefined && node.classification !== NodeClassification.Pruned;
    });
    return { classifiedTree, roots: keptRoots };
}

/**
 * Recursively classifies a single node and its descendants as matched, glue, or pruned.
 *
 * Uses memoization via the `classifiedTree` map to avoid reprocessing nodes
 * that have already been classified through a different path in the DAG.
 *
 * @param actionID - Entity ID for the action to classify.
 * @param candidateSet - The set of all action IDs in the spanning tree.
 * @param matchedActionIDs - The set of matched action IDs from the sifting result.
 * @param actionToRole - A mapping from matched action IDs to their role names.
 * @param actionCache - The action data cache.
 * @param classifiedTree - The classified tree map, mutated in place.
 * @returns The classified node.
 */
function classifyNode(
    actionID: UID,
    candidateSet: Set<UID>,
    matchedActionIDs: Set<UID>,
    actionToRole: Map<UID, RoleName>,
    actionCache: Map<UID, CachedActionData>,
    classifiedTree: Map<UID, ClassifiedNode>
): ClassifiedNode {
    const existing = classifiedTree.get(actionID);
    if (existing !== undefined) {
        return existing;
    }
    // Restrict children to those in the candidate set
    const data = getCachedData(actionID, actionCache);
    const candidateChildren = data.caused.filter(id => candidateSet.has(id));
    // Recursively classify children and collect kept ones
    const keptChildren: UID[] = [];
    for (const childID of candidateChildren) {
        const childNode = classifyNode(
            childID, candidateSet, matchedActionIDs, actionToRole, actionCache, classifiedTree
        );
        if (childNode.classification !== NodeClassification.Pruned) {
            keptChildren.push(childID);
        }
    }
    // Count hidden children (all caused children minus kept ones)
    const hiddenChildCount = data.caused.length - keptChildren.length;
    // Compute kept descendant count from children
    let keptDescendantCount = 0;
    for (const childID of keptChildren) {
        const childNode = classifiedTree.get(childID);
        if (childNode !== undefined) {
            keptDescendantCount += 1 + childNode.keptDescendantCount;
        }
    }
    // Sort kept children: elided siblings (pruned-only, zero kept descendants) are
    // not children, so no special sort for them — they're rendered separately.
    // Among kept children, sort chronologically by diegetic timestamp.
    keptChildren.sort((a, b) =>
        getCachedData(a, actionCache).timestamp - getCachedData(b, actionCache).timestamp
    );
    // Classify this node
    let node: ClassifiedNode;
    if (matchedActionIDs.has(actionID)) {
        node = {
            classification: NodeClassification.Matched,
            role: actionToRole.get(actionID) ?? null,
            keptChildren,
            hiddenChildCount,
            keptDescendantCount,
        };
    } else if (keptChildren.length > 0) {
        node = {
            classification: NodeClassification.Glue,
            role: null,
            keptChildren,
            hiddenChildCount,
            keptDescendantCount,
        };
    } else {
        node = {
            classification: NodeClassification.Pruned,
            role: null,
            keptChildren: [],
            hiddenChildCount: 0,
            keptDescendantCount: 0,
        };
    }
    classifiedTree.set(actionID, node);
    return node;
}

/**
 * Recursively renders a subtree rooted at the given action, using the classified tree
 * to determine which children to visit and how to style each node.
 *
 * @param actionID - Entity ID for the action at the root of this subtree.
 * @param renderContext - The sifting-match rendering context.
 * @param prefix - The tree-drawing prefix for this line.
 * @param isRoot - Whether this node is a root of the forest.
 * @param isLast - Whether this node is the last child of its parent.
 * @returns The rendered subtree as a string.
 */
function renderSubtree(
    actionID: UID,
    renderContext: SiftingMatchRenderContext,
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
    // Collect a collapsible chain or fall back to a single node
    const { run, lastID, lastIsBackReference } = collectCollapsibleChain(actionID, renderContext);
    // Assign short IDs to all newly encountered nodes in the run
    for (const nodeID of run) {
        if (!renderContext.visited.has(nodeID)) {
            assignShortID(nodeID, renderContext);
        }
    }
    // Build and join fragments for each node in the run
    const fragments = run.map((nodeID, i) => {
        const isBackReference = i === run.length - 1 && lastIsBackReference;
        return formatNodeFragment(nodeID, isBackReference, renderContext);
    });
    const separator = styled(TREE_ARROW_SEPARATOR, TREE_FRAME_STYLE, renderContext.ansi);
    let result = chrome + fragments.join(separator);
    // Render children of the terminal node (including sibling elision and descendant elision)
    if (!lastIsBackReference) {
        result += renderChildren(lastID, renderContext, prefix, isRoot, isLast);
        // If the terminal node has descendants beyond the kept tree, show descendant elision
        result += renderDescendantElision(lastID, renderContext, prefix, isRoot, isLast);
    }
    return result;
}

/**
 * Collects a collapsible chain starting at the given node in a sifting-match diagram.
 *
 * The same tail-only rule as single-anchor diagrams applies: only collapse
 * terminal chains (ending in a leaf or back-reference).
 *
 * @param actionID - Entity ID for the first action in the chain.
 * @param renderContext - The sifting-match rendering context.
 * @returns The collapsible chain.
 */
function collectCollapsibleChain(
    actionID: UID,
    renderContext: SiftingMatchRenderContext
): LinearChain {
    const run = walkSingleChildPath(actionID, renderContext);
    const lastID = run[run.length - 1];
    const lastIsBackReference = renderContext.visited.has(lastID);
    // If the terminal has children, discard the run so each node gets its own line
    if (!lastIsBackReference) {
        const classifiedNode = renderContext.classifiedTree.get(lastID);
        const lastHasChildren = classifiedNode !== undefined && classifiedNode.keptChildren.length > 0;
        if (lastHasChildren) {
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
 * Walks the single-child path starting at the given node in a sifting-match diagram.
 *
 * Matched actions always stand alone (they break chains). The path follows
 * `keptChildren` from the classified tree rather than raw `caused` links.
 *
 * @param startID - Entity ID for the first action in the path.
 * @param renderContext - The sifting-match rendering context.
 * @returns An array of action IDs constituting the path.
 */
function walkSingleChildPath(startID: UID, renderContext: SiftingMatchRenderContext): UID[] {
    const run: UID[] = [startID];
    // Matched actions always stand alone
    const startNode = renderContext.classifiedTree.get(startID);
    if (startNode !== undefined && startNode.classification === NodeClassification.Matched) {
        return run;
    }
    let currentID = startID;
    while (true) {
        const classifiedNode = renderContext.classifiedTree.get(currentID);
        if (classifiedNode === undefined || classifiedNode.keptChildren.length !== 1) {
            break;
        }
        const nextID = classifiedNode.keptChildren[0];
        // Stop before matched actions (they get their own line)
        const nextNode = renderContext.classifiedTree.get(nextID);
        if (nextNode !== undefined && nextNode.classification === NodeClassification.Matched) {
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
 * Formats a single node fragment for the diagram line, styled according to its classification.
 *
 * @param nodeID - Entity ID for the action node.
 * @param isBackRef - Whether this node is a back-reference at the end of a run.
 * @param renderContext - The sifting-match rendering context.
 * @returns The formatted fragment string.
 */
function formatNodeFragment(nodeID: UID, isBackRef: boolean, renderContext: SiftingMatchRenderContext): string {
    const label = renderContext.formatLabel(nodeID);
    const shortID = getShortID(nodeID, renderContext);
    if (isBackRef) {
        return formatBackRef(label, shortID, renderContext.ansi);
    }
    const classifiedNode = renderContext.classifiedTree.get(nodeID);
    const isMatchedWithRole = classifiedNode !== undefined
        && classifiedNode.classification === NodeClassification.Matched
        && classifiedNode.role !== null;
    if (isMatchedWithRole) {
        const roleColor = renderContext.roleColorMap.get(classifiedNode.role) ?? TREE_CONTENT_STYLE;
        const formattedNode =
            styled(label, roleColor, renderContext.ansi)
            + " " + styled(`(${classifiedNode.role})`, roleColor, renderContext.ansi)
            + " " + styled(`[${shortID}]`, TREE_FRAME_STYLE, renderContext.ansi);
        return formattedNode;
    }
    // Glue node
    const formattedNode =
        styled(label, TREE_GLUE_STYLE, renderContext.ansi)
        + " " + styled(`[${shortID}]`, TREE_FRAME_STYLE, renderContext.ansi);
    return formattedNode;
}

/**
 * Renders the children of the given node, using `keptChildren` from the classified tree.
 *
 * @param parentID - Entity ID for the parent whose children will be rendered.
 * @param renderContext - The sifting-match rendering context.
 * @param prefix - The tree-drawing prefix for the parent line.
 * @param isRoot - Whether the parent is a root of the forest.
 * @param isLast - Whether the parent is the last child of its own parent.
 * @returns The rendered children as a string (including leading newlines), or empty string.
 */
function renderChildren(
    parentID: UID,
    renderContext: SiftingMatchRenderContext,
    prefix: string,
    isRoot: boolean,
    isLast: boolean
): string {
    const classifiedNode = renderContext.classifiedTree.get(parentID);
    if (classifiedNode === undefined) {
        return "";
    }
    const children = classifiedNode.keptChildren;
    const hasKeptChildren = children.length > 0;
    // Show sibling elision only when there are ALSO kept children to render below it.
    // If there are no kept children, descendant elision covers everything.
    const hasHiddenSiblings = classifiedNode.hiddenChildCount > 0 && hasKeptChildren;
    if (!hasHiddenSiblings && !hasKeptChildren) {
        return "";
    }
    const childPrefix = isRoot ? "" : (prefix + (isLast ? "   " : "\u2502  "));
    let result = "";
    // If there are pruned siblings, render the elision indicator as the first child
    if (hasHiddenSiblings) {
        result += "\n" + styled(
            `${childPrefix}${TREE_TRUNCATION_INDICATOR} (${classifiedNode.hiddenChildCount})`,
            TREE_FRAME_STYLE,
            renderContext.ansi
        );
    }
    // Apply the maxChildren limit to the kept children
    const visibleCount = Math.min(children.length, renderContext.maxChildren);
    const hiddenCount = children.length - visibleCount;
    for (let i = 0; i < visibleCount; i++) {
        const childIsLast = i === visibleCount - 1 && hiddenCount === 0;
        result += "\n" + renderSubtree(children[i], renderContext, childPrefix, false, childIsLast);
    }
    // If children were truncated by maxChildren, show an indicator
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
 * Renders a descendant elision indicator below the given node, if it has descendants
 * in the full chronicle that are not part of the kept tree.
 *
 * @param actionID - Entity ID for the action whose descendants may be elided.
 * @param renderContext - The sifting-match rendering context.
 * @param prefix - The tree-drawing prefix for the parent line.
 * @param isRoot - Whether the parent is a root of the forest.
 * @param isLast - Whether the parent is the last child of its own parent.
 * @returns The elision indicator line (including leading newline), or empty string.
 */
function renderDescendantElision(
    actionID: UID,
    renderContext: SiftingMatchRenderContext,
    prefix: string,
    isRoot: boolean,
    isLast: boolean
): string {
    const data = getCachedData(actionID, renderContext.actionCache);
    const classifiedNode = renderContext.classifiedTree.get(actionID);
    if (classifiedNode === undefined) {
        return "";
    }
    // Only show descendant elision on leaf nodes of the kept tree — non-leaf nodes
    // delegate to their children's own descendant elision recursively
    if (classifiedNode.keptChildren.length > 0) {
        return "";
    }
    // Count descendants not in the kept tree: total descendants minus kept descendants
    const totalDescendants = data.descendantCount;
    const keptDescendants = classifiedNode.keptDescendantCount;
    const elidedDescendants = totalDescendants - keptDescendants;
    if (elidedDescendants <= 0) {
        return "";
    }
    const childPrefix = isRoot ? "" : (prefix + (isLast ? "   " : "\u2502  "));
    return "\n" + styled(
        `${childPrefix}${TREE_TRUNCATION_INDICATOR} (${elidedDescendants})`,
        TREE_FRAME_STYLE,
        renderContext.ansi
    );
}

/**
 * Renders an ancestor elision indicator above a root node, if the root has ancestors
 * in the full chronicle that are not part of the spanning tree.
 *
 * @param rootID - Entity ID for the root action.
 * @param actionCache - The action data cache.
 * @param ansi - Whether to apply ANSI styling.
 * @returns The elision indicator line (including trailing newline), or empty string.
 */
function renderAncestorElision(
    rootID: UID,
    actionCache: Map<UID, CachedActionData>,
    ansi: boolean
): string {
    const data = getCachedData(rootID, actionCache);
    // Ancestors not in the candidate set
    const elidedAncestors = data.ancestorCount;
    if (elidedAncestors <= 0) {
        return "";
    }
    return styled(
        `${TREE_TRUNCATION_INDICATOR} (${elidedAncestors})`,
        TREE_FRAME_STYLE,
        ansi
    ) + "\n";
}

/**
 * Constructs a sifting-match diagram in elided mode.
 *
 * Fetches only the matched actions, determines their causal relationships, and renders
 * them with gap counts annotating the space between them. Glue actions are never fetched
 * or rendered — only counted.
 *
 * @param matchedActionIDs - The set of all matched action IDs.
 * @param actionToRole - A mapping from matched action IDs to their role names.
 * @param roleColorMap - A mapping from role names to ANSI color codes.
 * @param formatLabel - Optional label callback, or `null` for default.
 * @param ansi - Whether to apply ANSI styling.
 * @param maxChildren - The maximum number of children to render per node.
 * @returns The constructed diagram as a string.
 */
async function constructElidedDiagram(
    matchedActionIDs: Set<UID>,
    actionToRole: Map<UID, RoleName>,
    roleColorMap: Map<RoleName, string>,
    formatLabel: ((actionID: UID) => string) | null,
    ansi: boolean,
    maxChildren: number
): Promise<string> {
    // Fetch only the matched actions
    const elideCache = new Map<UID, ElideNodeData>();
    for (const actionID of matchedActionIDs) {
        await fetchElideData(actionID, elideCache);
    }
    // Build the matched-action forest
    const { forest, roots } = buildMatchedForest(matchedActionIDs, actionToRole, elideCache);
    // Pre-assign short IDs so convergence references to not-yet-rendered ancestors resolve
    const matchedShortIDs = preassignMatchedShortIDs(roots, forest, maxChildren);
    // Set up the rendering context
    const renderContext: ElidedRenderContext = {
        elideCache,
        matchedForest: forest,
        roleColorMap,
        matchedShortIDs,
        visited: new Map(),
        legend: [],
        formatLabel: formatLabel ?? ((actionID: UID) => {
            const data = elideCache.get(actionID);
            return data !== undefined ? data.name : actionID;
        }),
        ansi,
        maxChildren,
        familyLetter: "",
        familyNodeCounter: 0,
    };
    // Render each root with ancestor elision above
    const sections: string[] = [];
    for (let i = 0; i < roots.length; i++) {
        renderContext.familyLetter = getFamilyLetter(i);
        renderContext.familyNodeCounter = 1;
        const rootData = elideCache.get(roots[i]);
        let section = "";
        // Ancestor elision above the root
        if (rootData !== undefined && rootData.ancestorCount > 0) {
            section += styled(
                `${TREE_TRUNCATION_INDICATOR} (${rootData.ancestorCount})`,
                TREE_FRAME_STYLE,
                ansi
            ) + "\n";
        }
        section += renderElidedSubtree(roots[i], renderContext, "", true, true);
        sections.push(section);
    }
    // Assemble with a legend
    const treeDiagram = sections.join("\n\n");
    const legend = renderLegend(renderContext.legend, ansi);
    return `${treeDiagram}\n\n${legend}`;
}

/**
 * Fetches and caches action data for elided mode, including the full ancestor set.
 *
 * @param actionID - Entity ID for the action to fetch.
 * @param cache - The cache to populate.
 * @returns The cached elide node data.
 */
async function fetchElideData(actionID: UID, cache: Map<UID, ElideNodeData>): Promise<ElideNodeData> {
    const existing = cache.get(actionID);
    if (existing !== undefined) {
        return existing;
    }
    const view = await getActionView(actionID);
    const data: ElideNodeData = {
        name: view.name,
        caused: view.caused,
        timestamp: view.timestamp,
        ancestorCount: view.ancestors.length,
        descendantCount: view.descendants.length,
        ancestorSet: new Set(view.ancestors),
        descendantSet: new Set(view.descendants),
    };
    cache.set(actionID, data);
    return data;
}

/**
 * Builds the matched-action forest: determines parent-child relationships
 * among matched actions, computes pruned child counts and path gap counts.
 *
 * @param matchedActionIDs - The set of all matched action IDs.
 * @param actionToRole - A mapping from matched action IDs to their role names.
 * @param elideCache - The elide node data cache.
 * @returns The forest (map from action ID to forest node) and the chronologically sorted roots.
 */
function buildMatchedForest(
    matchedActionIDs: Set<UID>,
    actionToRole: Map<UID, RoleName>,
    elideCache: Map<UID, ElideNodeData>
): { forest: Map<UID, MatchedForestNode>; roots: UID[] } {
    const { matchedChildrenOf, roots } = buildMatchedGraph(matchedActionIDs, elideCache);
    // Build forest nodes with gap counts and pruned child counts
    const forest = new Map<UID, MatchedForestNode>();
    for (const actionID of matchedActionIDs) {
        const data = elideCache.get(actionID);
        const children = matchedChildrenOf.get(actionID) ?? [];
        // Sort children chronologically
        children.sort((a, b) => {
            const dataA = elideCache.get(a);
            const dataB = elideCache.get(b);
            if (dataA === undefined || dataB === undefined) {
                return 0;
            }
            return dataA.timestamp - dataB.timestamp;
        });
        // Compute path analysis and pruned child count
        const { pathGaps, namedConvergences, anonymousConvergence } =
            computePathAnalysis(actionID, data, children, matchedActionIDs, elideCache);
        const hiddenChildCount = computeHiddenChildCount(data, children, matchedActionIDs, elideCache);
        forest.set(actionID, {
            role: actionToRole.get(actionID) ?? null,
            matchedChildren: children,
            hiddenChildCount,
            pathGaps,
            namedConvergences,
            anonymousConvergence,
        });
    }
    return { forest, roots };
}

/**
 * Builds the parent-child graph among matched actions and identifies root actions.
 *
 * For each matched action, determines which other matched actions are its
 * direct parents in the causal graph (closest matched ancestors with no
 * other matched action between them).
 *
 * @param matchedActionIDs - The set of all matched action IDs.
 * @param elideCache - The elide node data cache.
 * @returns The matched-children map and chronologically sorted root action IDs.
 */
function buildMatchedGraph(
    matchedActionIDs: Set<UID>,
    elideCache: Map<UID, ElideNodeData>
): { matchedChildrenOf: Map<UID, UID[]>; roots: UID[] } {
    // Initialize parent and child maps for each matched action
    const matchedParentsOf = new Map<UID, UID[]>();
    const matchedChildrenOf = new Map<UID, UID[]>();
    for (const actionID of matchedActionIDs) {
        matchedParentsOf.set(actionID, []);
        matchedChildrenOf.set(actionID, []);
    }
    for (const childID of matchedActionIDs) {
        const childData = elideCache.get(childID);
        if (childData === undefined) {
            continue;
        }
        // Find all matched ancestors of this action
        const matchedAncestors: UID[] = [];
        for (const candidateID of matchedActionIDs) {
            if (candidateID !== childID && childData.ancestorSet.has(candidateID)) {
                matchedAncestors.push(candidateID);
            }
        }
        // Filter to matched parents: remove any ancestor A if another ancestor C
        // sits between A and childID (i.e., C is a descendant of A)
        const matchedParents: UID[] = [];
        for (const ancestorID of matchedAncestors) {
            const ancestorData = elideCache.get(ancestorID);
            if (ancestorData === undefined) {
                continue;
            }
            const isShadowed = matchedAncestors.some(otherID => {
                if (otherID === ancestorID) {
                    return false;
                }
                const otherData = elideCache.get(otherID);
                return otherData !== undefined && otherData.ancestorSet.has(ancestorID);
            });
            if (!isShadowed) {
                matchedParents.push(ancestorID);
            }
        }
        matchedParentsOf.set(childID, matchedParents);
        // Wire up children
        for (const parentID of matchedParents) {
            const children = matchedChildrenOf.get(parentID);
            if (children !== undefined) {
                children.push(childID);
            }
        }
    }
    // Identify roots (matched actions with no matched parents)
    const roots: UID[] = [];
    for (const actionID of matchedActionIDs) {
        const parents = matchedParentsOf.get(actionID);
        if (parents !== undefined && parents.length === 0) {
            roots.push(actionID);
        }
    }
    // Sort roots chronologically
    roots.sort((a, b) => {
        const dataA = elideCache.get(a);
        const dataB = elideCache.get(b);
        if (dataA === undefined || dataB === undefined) {
            return 0;
        }
        return dataA.timestamp - dataB.timestamp;
    });
    return { matchedChildrenOf, roots };
}

/**
 * Computes path gaps and convergence data between a parent action and its matched children.
 *
 * For each matched child, partitions the child's non-matched ancestors
 * into: direct-path glue (on the causal path between parent and child)
 * and other-lineage convergences (arriving from outside the direct path).
 *
 * @param parentID - Entity ID for the parent action.
 * @param parentData - The parent's cached elide node data, if available.
 * @param children - The parent's matched children.
 * @param matchedActionIDs - The set of all matched action IDs.
 * @param elideCache - The elide node data cache.
 * @returns The path gaps, named convergences, and anonymous convergence maps.
 */
function computePathAnalysis(
    parentID: UID,
    parentData: ElideNodeData | undefined,
    children: readonly UID[],
    matchedActionIDs: Set<UID>,
    elideCache: Map<UID, ElideNodeData>
): {
    pathGaps: Map<UID, number>;
    namedConvergences: Map<UID, [UID, number][]>;
    anonymousConvergence: Map<UID, number>;
} {
    const pathGaps = new Map<UID, number>();
    const namedConvergences = new Map<UID, [UID, number][]>();
    const anonymousConvergence = new Map<UID, number>();
    for (const childID of children) {
        const childData = elideCache.get(childID);
        if (childData === undefined || parentData === undefined) {
            continue;
        }
        // Partition non-matched ancestors of child (excluding parent and parent's ancestors)
        // into: direct-path glue (descendants of parent) and other-lineage (not descendants)
        let gap = 0;
        const otherAncestors: UID[] = [];
        for (const ancestorID of childData.ancestorSet) {
            // Skip the parent itself and the parent's own ancestors
            if (ancestorID === parentID || parentData.ancestorSet.has(ancestorID)) {
                continue;
            }
            // Skip other matched actions (they're accounted for elsewhere in the forest)
            if (matchedActionIDs.has(ancestorID)) {
                continue;
            }
            // Is this ancestor on the direct path from parent to child?
            if (parentData.descendantSet.has(ancestorID)) {
                gap++;
            } else {
                otherAncestors.push(ancestorID);
            }
        }
        if (gap > 0) {
            pathGaps.set(childID, gap);
        }
        // For other-lineage ancestors, determine which are traceable to a named (matched)
        // ancestor and which are truly anonymous
        if (otherAncestors.length > 0) {
            const namedCounts = new Map<UID, number>();
            let anonymousCount = 0;
            for (const otherID of otherAncestors) {
                // Find the closest matched ancestor of this other-lineage action
                let closestID: UID | null = null;
                let closestDepth = -1;
                for (const matchedID of matchedActionIDs) {
                    if (matchedID === parentID) {
                        continue;
                    }
                    const matchedData = elideCache.get(matchedID);
                    if (matchedData !== undefined && matchedData.descendantSet.has(otherID)) {
                        if (matchedData.ancestorCount > closestDepth) {
                            closestDepth = matchedData.ancestorCount;
                            closestID = matchedID;
                        }
                    }
                }
                if (closestID !== null) {
                    namedCounts.set(closestID, (namedCounts.get(closestID) ?? 0) + 1);
                } else {
                    anonymousCount++;
                }
            }
            if (namedCounts.size > 0) {
                namedConvergences.set(childID, [...namedCounts.entries()]);
            }
            if (anonymousCount > 0) {
                anonymousConvergence.set(childID, anonymousCount);
            }
        }
    }
    return { pathGaps, namedConvergences, anonymousConvergence };
}

/**
 * Computes the number of direct children of a parent action that are hidden from the
 * elided diagram (neither matched nor on the path to a matched descendant).
 *
 * @param parentData - The parent's cached elide node data, if available.
 * @param matchedChildren - The parent's matched children in the forest.
 * @param matchedActionIDs - The set of all matched action IDs.
 * @param elideCache - The elide node data cache.
 * @returns The count of pruned direct children.
 */
function computeHiddenChildCount(
    parentData: ElideNodeData | undefined,
    matchedChildren: readonly UID[],
    matchedActionIDs: Set<UID>,
    elideCache: Map<UID, ElideNodeData>
): number {
    if (parentData === undefined) {
        return 0;
    }
    let keptDirectChildren = 0;
    for (const causedID of parentData.caused) {
        // A direct child is "kept" if it's matched or is an ancestor of
        // any matched child of this node
        if (matchedActionIDs.has(causedID)) {
            keptDirectChildren++;
            continue;
        }
        const isOnPath = matchedChildren.some(matchedChildID => {
            const matchedChildData = elideCache.get(matchedChildID);
            return matchedChildData !== undefined && matchedChildData.ancestorSet.has(causedID);
        });
        if (isOnPath) {
            keptDirectChildren++;
        }
    }
    return parentData.caused.length - keptDirectChildren;
}

/**
 * Pre-computes short IDs for all matched actions by simulating the rendering
 * traversal order (roots in sequence, DFS within each root, limited by maxChildren).
 *
 * This allows convergence references to matched actions that haven't been
 * rendered yet to resolve correctly.
 *
 * @param roots - The chronologically sorted root action IDs.
 * @param forest - The matched-action forest.
 * @param maxChildren - The maximum number of children rendered per node.
 * @returns A map from matched action IDs to their pre-assigned short IDs.
 */
function preassignMatchedShortIDs(
    roots: readonly UID[],
    forest: Map<UID, MatchedForestNode>,
    maxChildren: number
): Map<UID, string> {
    const ids = new Map<UID, string>();
    for (let i = 0; i < roots.length; i++) {
        const familyLetter = getFamilyLetter(i);
        let counter = 1;
        // DFS matching the rendering traversal order
        function visit(actionID: UID): void {
            if (ids.has(actionID)) {
                return;
            }
            ids.set(actionID, `${familyLetter}${counter}`);
            counter++;
            const node = forest.get(actionID);
            if (node !== undefined) {
                const visible = Math.min(node.matchedChildren.length, maxChildren);
                for (let j = 0; j < visible; j++) {
                    visit(node.matchedChildren[j]);
                }
            }
        }
        visit(roots[i]);
    }
    return ids;
}

/**
 * Recursively renders a subtree in elided mode.
 *
 * Every node is a matched action rendered on its own line. Gap counts between parent-child
 * pairs are rendered as `⋮ (N)` indicators.
 *
 * @param actionID - Entity ID for the matched action to render.
 * @param renderContext - The elided rendering context.
 * @param prefix - The tree-drawing prefix for this line.
 * @param isRoot - Whether this node is a root of the forest.
 * @param isLast - Whether this node is the last child of its parent.
 * @returns The rendered subtree as a string.
 */
function renderElidedSubtree(
    actionID: UID,
    renderContext: ElidedRenderContext,
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
    // Assign short ID and render the node
    assignShortID(actionID, renderContext);
    const shortID = getShortID(actionID, renderContext);
    const node = renderContext.matchedForest.get(actionID);
    const role = node?.role ?? null;
    const label = renderContext.formatLabel(actionID);
    // Format: name (role) [shortID]
    let fragment: string;
    if (role !== null) {
        const roleColor = renderContext.roleColorMap.get(role) ?? TREE_CONTENT_STYLE;
        fragment = styled(label, roleColor, renderContext.ansi)
            + " " + styled(`(${role})`, roleColor, renderContext.ansi)
            + " " + styled(`[${shortID}]`, TREE_FRAME_STYLE, renderContext.ansi);
    } else {
        fragment = styled(label, TREE_CONTENT_STYLE, renderContext.ansi)
            + " " + styled(`[${shortID}]`, TREE_FRAME_STYLE, renderContext.ansi);
    }
    let result = chrome + fragment;
    // Render children
    if (node !== undefined) {
        result += renderElidedChildren(node, renderContext, prefix, isRoot, isLast);
    }
    // Descendant elision on leaf nodes
    if (node !== undefined && node.matchedChildren.length === 0) {
        const data = renderContext.elideCache.get(actionID);
        if (data !== undefined && data.descendantCount > 0) {
            const childPrefix = isRoot ? "" : (prefix + (isLast ? "   " : "\u2502  "));
            result += "\n" + styled(
                `${childPrefix}${TREE_TRUNCATION_INDICATOR} (${data.descendantCount})`,
                TREE_FRAME_STYLE,
                renderContext.ansi
            );
        }
    }
    return result;
}

/**
 * Renders the matched children of a node in elided mode, with sibling elision,
 * path gaps, and maxChildren truncation.
 *
 * @param parentNode - The parent's forest node.
 * @param renderContext - The elided rendering context.
 * @param prefix - The tree-drawing prefix for the parent line.
 * @param isRoot - Whether the parent is a root.
 * @param isLast - Whether the parent is the last child of its own parent.
 * @returns The rendered children as a string (including leading newlines), or empty string.
 */
function renderElidedChildren(
    parentNode: MatchedForestNode,
    renderContext: ElidedRenderContext,
    prefix: string,
    isRoot: boolean,
    isLast: boolean
): string {
    const children = parentNode.matchedChildren;
    const hasKeptChildren = children.length > 0;
    const hasHiddenSiblings = parentNode.hiddenChildCount > 0 && hasKeptChildren;
    if (!hasHiddenSiblings && !hasKeptChildren) {
        return "";
    }
    const childPrefix = isRoot ? "" : (prefix + (isLast ? "   " : "\u2502  "));
    let result = "";
    // Sibling elision as the first child
    if (hasHiddenSiblings) {
        result += "\n" + styled(
            `${childPrefix}${TREE_TRUNCATION_INDICATOR} (${parentNode.hiddenChildCount})`,
            TREE_FRAME_STYLE,
            renderContext.ansi
        );
    }
    // Apply maxChildren limit
    const visibleCount = Math.min(children.length, renderContext.maxChildren);
    const hiddenCount = children.length - visibleCount;
    for (let i = 0; i < visibleCount; i++) {
        const childID = children[i];
        const childIsLast = i === visibleCount - 1 && hiddenCount === 0;
        // Path gap above the child (glue actions on the direct causal path)
        const gap = parentNode.pathGaps.get(childID) ?? 0;
        if (gap > 0) {
            result += "\n" + styled(
                `${childPrefix}${TREE_TRUNCATION_INDICATOR} (${gap})`,
                TREE_FRAME_STYLE,
                renderContext.ansi
            );
        }
        // Named convergences (ancestors traceable to a named ancestor in the diagram)
        const named = parentNode.namedConvergences.get(childID) ?? [];
        for (const [namedAncestorID, count] of named) {
            const ancestorShortID = renderContext.matchedShortIDs.get(namedAncestorID);
            if (ancestorShortID !== undefined) {
                result += "\n" + styled(
                    `${childPrefix}[${TREE_CONVERGENCE_ELLIPSIS}${ancestorShortID}] ${TREE_TRUNCATION_INDICATOR} (${count})`,
                    TREE_FRAME_STYLE,
                    renderContext.ansi
                );
            }
        }
        // Anonymous convergence (ancestors from lineages with no named ancestor)
        const anonymous = parentNode.anonymousConvergence.get(childID) ?? 0;
        if (anonymous > 0) {
            result += "\n" + styled(
                `${childPrefix}${TREE_CONVERGENCE_ANONYMOUS} ${TREE_TRUNCATION_INDICATOR} (${anonymous})`,
                TREE_FRAME_STYLE,
                renderContext.ansi
            );
        }
        result += "\n" + renderElidedSubtree(childID, renderContext, childPrefix, false, childIsLast);
    }
    // maxChildren truncation indicator
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
 * Renders the legend as a flat UID lookup table.
 *
 * Entries appear in diagram order (the order short IDs were assigned during rendering).
 * Colons align vertically, one space after the longest short ID.
 *
 * @param legend - Array of `[shortID, UID]` pairs in diagram order.
 * @param ansi - Whether to apply ANSI styling.
 * @returns The formatted legend string.
 */
function renderLegend(legend: readonly [string, UID][], ansi: boolean): string {
    if (legend.length === 0) {
        return "";
    }
    // Align colons vertically, one space after the longest short ID
    const maxShortIDWidth = Math.max(...legend.map(([shortID]) => shortID.length));
    const rows = legend.map(([shortID, uid]) =>
        `${shortID.padEnd(maxShortIDWidth)} ${styled(":", TREE_FRAME_STYLE, ansi)} ${uid}`
    );
    // Draw a box around the rows
    const unstyledRowWidth = Math.max(...legend.map(([shortID, uid]) =>
        maxShortIDWidth + 3 + uid.length
    ));
    const top = "\u250C\u2500" + "\u2500".repeat(unstyledRowWidth) + "\u2500\u2510";
    const bottom = "\u2514\u2500" + "\u2500".repeat(unstyledRowWidth) + "\u2500\u2518";
    const boxedRows = legend.map(([shortID, uid], i) => {
        const unstyledLength = maxShortIDWidth + 3 + uid.length;
        const padding = " ".repeat(unstyledRowWidth - unstyledLength);
        return styled("\u2502", TREE_FRAME_STYLE, ansi) + " " + rows[i] + padding
            + " " + styled("\u2502", TREE_FRAME_STYLE, ansi);
    });
    const renderedLegend =
        [styled(top, TREE_FRAME_STYLE, ansi), ...boxedRows, styled(bottom, TREE_FRAME_STYLE, ansi)].join("\n");
    return renderedLegend;
}
