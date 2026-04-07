import type { DiegeticTimestamp, UID } from "../adapter/types";
import type { ActionName, RoleName } from "../content-bundle/types";
import type { NodeClassification } from "./constants";

/**
 * Action data cached during the discovery and rendering phases of tree-diagram construction.
 */
export interface CachedActionData {
    /**
     * The name of the action, as defined in the content bundle.
     */
    readonly name: ActionName;
    /**
     * Entity IDs for the actions directly caused by this one.
     */
    readonly caused: readonly UID[];
    /**
     * Entity IDs for the actions that directly caused this one.
     */
    readonly causes: readonly UID[];
    /**
     * The diegetic timestamp at which this action was performed.
     */
    readonly timestamp: DiegeticTimestamp;
    /**
     * The total number of causal ancestors of this action.
     */
    readonly ancestorCount: number;
    /**
     * The total number of causal descendants of this action.
     */
    readonly descendantCount: number;
}

/**
 * The subset of rendering context fields needed by the shared short-ID utilities.
 *
 * Both {@link RenderContext} and sifting-match rendering
 * contexts satisfy this interface via structural typing.
 */
export interface ShortIDContext {
    /**
     * A map from action IDs to their assigned short IDs.
     */
    readonly visited: Map<UID, string>;
    /**
     * An array containing pairs of the form `[shortID, UID]`, in diagram order.
     */
    readonly legend: [string, UID][];
    /**
     * The letter prefix for the current causal family (e.g., `"a"`, `"b"`).
     */
    familyLetter: string;
    /**
     * The next node number within the causal family at hand.
     */
    familyNodeCounter: number;
}

/**
 * Mutable state tracked during a rendering pass in tree-diagram construction.
 */
export interface RenderContext {
    /**
     * A cache mapping action IDs to their fetched data.
     */
    readonly actionCache: Map<UID, CachedActionData>;
    /**
     * A map from action IDs to their assigned short IDs.
     *
     * This grows during rendering.
     */
    readonly visited: Map<UID, string>;
    /**
     * An array containing pairs of the form `[shortID, UID]`, in diagram order.
     *
     * This grows during rendering.
     */
    readonly legend: [string, UID][];
    /**
     * Entity ID for the anchor action highlighted in the diagram.
     */
    readonly anchorID: UID;
    /**
     * Callback that produces the label text for a given action node.
     *
     * This is either a callback supplied by the user or a default callback that we define.
     */
    readonly formatLabel: (actionID: UID) => string;
    /**
     * The string used to mark the anchor action in the diagram.
     *
     * This is either a marker supplied by the user or a default marker that we define.
     */
    readonly anchorMarker: string;
    /**
     * Whether to include ANSI escape codes in the output.
     */
    readonly ansi: boolean;
    /**
     * The maximum number of children to render per node, if any, else `Infinity`.
     */
    readonly maxChildren: number;
    /**
     * The letter prefix for the current causal family (e.g., `"a"`, `"b"`).
     */
    familyLetter: string;
    /**
     * The next node number within the causal family at hand.
     */
    familyNodeCounter: number;
}

/**
 * A terminal linear causal chain of single-child actions, as collected during the
 * rendering of causal tree diagrams.
 */
export interface LinearChain {
    /**
     * Array containing the action IDs constituting the chain, in causal order.
     */
    readonly run: UID[];
    /**
     * Entity ID for the last action in the chain.
     */
    readonly lastID: UID;
    /**
     * Whether the last action in the chain is a back-reference to an already-rendered node.
     */
    readonly lastIsBackReference: boolean;
}

/**
 * A node in the classified spanning tree produced during sifting-match diagram construction.
 *
 * Each node is either a matched action (part of the sifting result), a glue action (on the
 * causal path between matched actions), or pruned (irrelevant to the sifting result).
 */
export interface ClassifiedNode {
    /**
     * Whether this node is a matched action, a glue action, or pruned.
     */
    readonly classification: NodeClassification;
    /**
     * The role under which this action was matched, if any.
     *
     * Non-null only when `classification` is {@link NodeClassification.Matched}.
     */
    readonly role: RoleName | null;
    /**
     * The subset of `caused` children that survived pruning.
     *
     * During rendering, only these children are visited — pruned branches are excluded.
     */
    readonly keptChildren: readonly UID[];
    /**
     * The number of children hidden from this node's rendering.
     *
     * Rendered as a sibling elision indicator (`⋮ (N)`) before the kept children.
     */
    readonly hiddenChildCount: number;
    /**
     * The total number of kept descendants (transitive) of this node.
     *
     * Used to sort children chronologically with elided siblings first.
     */
    readonly keptDescendantCount: number;
}

/**
 * Mutable state tracked during a rendering pass in sifting-match diagram construction.
 */
export interface SiftingMatchRenderContext {
    /**
     * A cache mapping action IDs to their fetched data.
     */
    readonly actionCache: Map<UID, CachedActionData>;
    /**
     * The classified spanning tree, mapping each action ID to its classification.
     */
    readonly classifiedTree: Map<UID, ClassifiedNode>;
    /**
     * A mapping from role names to their assigned ANSI color codes.
     */
    readonly roleColorMap: Map<RoleName, string>;
    /**
     * A map from action IDs to their assigned short IDs.
     *
     * This grows during rendering.
     */
    readonly visited: Map<UID, string>;
    /**
     * An array containing pairs of the form `[shortID, UID]`, in diagram order.
     *
     * This grows during rendering.
     */
    readonly legend: [string, UID][];
    /**
     * Callback that produces the label text for a given action node.
     *
     * This is either a callback supplied by the user or a default callback that we define.
     */
    readonly formatLabel: (actionID: UID) => string;
    /**
     * Whether to include ANSI escape codes in the output.
     */
    readonly ansi: boolean;
    /**
     * The maximum number of children to render per node, if any, else `Infinity`.
     */
    readonly maxChildren: number;
    /**
     * The letter prefix for the current causal family (e.g., `"a"`, `"b"`).
     */
    familyLetter: string;
    /**
     * The next node number within the causal family at hand.
     */
    familyNodeCounter: number;
}

/**
 * Action data fetched for a matched action in elided mode.
 *
 * Unlike {@link CachedActionData}, this includes the full ancestor set for O(1) ancestry
 * queries between matched actions, avoiding the need to fetch the entire ancestor closure.
 */
export interface ElideNodeData {
    /**
     * The name of the action, as defined in the content bundle.
     */
    readonly name: ActionName;
    /**
     * Entity IDs for the actions directly caused by this one.
     */
    readonly caused: readonly UID[];
    /**
     * The diegetic timestamp at which this action was performed.
     */
    readonly timestamp: DiegeticTimestamp;
    /**
     * The total number of causal ancestors of this action.
     */
    readonly ancestorCount: number;
    /**
     * The total number of causal descendants of this action.
     */
    readonly descendantCount: number;
    /**
     * The full set of ancestor action IDs, for O(1) ancestry lookups.
     */
    readonly ancestorSet: ReadonlySet<UID>;
    /**
     * The full set of descendant action IDs, for O(1) descendancy lookups.
     */
    readonly descendantSet: ReadonlySet<UID>;
}

/**
 * A node in the matched-action forest constructed during elided mode rendering.
 *
 * Each node represents a matched action and its relationships to other matched actions
 * in the same causal lineage.
 */
export interface MatchedForestNode {
    /**
     * The role under which this action was matched.
     */
    readonly role: RoleName | null;
    /**
     * Matched actions that are direct causal descendants of this one in the forest
     * (i.e., no other matched action sits between them in the causal chain).
     */
    readonly matchedChildren: UID[];
    /**
     * The number of direct `caused` children hidden from the diagram.
     */
    readonly hiddenChildCount: number;
    /**
     * For each matched child, the count of glue actions on the causal path between
     * this action and that child.
     */
    readonly pathGaps: ReadonlyMap<UID, number>;
    /**
     * For each matched child, named convergences: ancestors arriving from a lineage
     * traceable to another named (matched) ancestor in the diagram.
     *
     * Each entry maps the matched child to an array of `[namedAncestorID, count]` pairs.
     * Rendered as `[⋯shortID] ⋮ (N)`.
     */
    readonly namedConvergences: ReadonlyMap<UID, readonly [UID, number][]>;
    /**
     * For each matched child, the count of ancestors arriving from lineages that have
     * NO named ancestor in the diagram (truly anonymous convergence).
     *
     * Rendered as `─┼ ⋮ (N)`.
     */
    readonly anonymousConvergence: ReadonlyMap<UID, number>;
}

/**
 * Mutable state tracked during a rendering pass in elided sifting-match diagram construction.
 */
export interface ElidedRenderContext {
    /**
     * Cache mapping matched action IDs to their fetched data.
     */
    readonly elideCache: Map<UID, ElideNodeData>;
    /**
     * The matched-action forest, mapping each matched action to its forest node.
     */
    readonly matchedForest: Map<UID, MatchedForestNode>;
    /**
     * A mapping from role names to their assigned ANSI color codes.
     */
    readonly roleColorMap: Map<RoleName, string>;
    /**
     * Pre-computed short IDs for all matched actions, keyed by action ID.
     *
     * Computed before rendering begins so that convergence references to
     * not-yet-rendered matched actions can still be resolved.
     */
    readonly matchedShortIDs: Map<UID, string>;
    /**
     * A map from action IDs to their assigned short IDs.
     *
     * This grows during rendering.
     */
    readonly visited: Map<UID, string>;
    /**
     * An array containing pairs of the form `[shortID, UID]`, in diagram order.
     *
     * This grows during rendering.
     */
    readonly legend: [string, UID][];
    /**
     * Callback that produces the label text for a given action node.
     */
    readonly formatLabel: (actionID: UID) => string;
    /**
     * Whether to include ANSI escape codes in the output.
     */
    readonly ansi: boolean;
    /**
     * The maximum number of children to render per node, if any, else `Infinity`.
     */
    readonly maxChildren: number;
    /**
     * The letter prefix for the current causal family (e.g., `"a"`, `"b"`).
     */
    familyLetter: string;
    /**
     * The next node number within the causal family at hand.
     */
    familyNodeCounter: number;
}
