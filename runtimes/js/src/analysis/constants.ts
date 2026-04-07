/**
 * The default marker string used to highlight the anchor action in a tree diagram.
 */
export const DEFAULT_ANCHOR_MARKER = "*";

/**
 * ANSI style for the focal point of a tree diagram (namely the anchor action).
 */
export const TREE_FOCAL_STYLE = "\x1b[92m";

/**
 * ANSI style for the content nodes in a tree diagram (namely action labels).
 */
export const TREE_CONTENT_STYLE = "\x1b[36m";

/**
 * ANSI style for the frame symbols in a tree diagram (connectors, arrows, short IDs).
 */
export const TREE_FRAME_STYLE = "\x1b[2m";

/**
 * Arrow separator used in collapsed tail chains in a tree diagram.
 */
export const TREE_ARROW_SEPARATOR = " \u2192 ";

/**
 * Truncation indicator shown when children in a tree diagram are hidden.
 */
export const TREE_TRUNCATION_INDICATOR = "\u22EE";

/**
 * Convergence indicator for anonymous other-parentage elision in sifting-match diagrams.
 *
 * Rendered as `─┼ ⋮ (N)` to show that N ancestors arrive from a lineage outside
 * the currently rendered causal path, where the source lineage has no named ancestor.
 */
export const TREE_CONVERGENCE_ANONYMOUS = "\u2500\u253C";

/**
 * Convergence reference prefix for named other-parentage elision in sifting-match diagrams.
 *
 * Rendered as `[⋯shortID] ⋮ (N)` to show that N ancestors arrive from the referenced
 * named ancestor's lineage. Uses the midline horizontal ellipsis (U+22EF), consistent
 * with the vertical ellipsis `⋮` used in other elision indicators.
 */
export const TREE_CONVERGENCE_ELLIPSIS = "\u22EF";

/**
 * ANSI style for glue actions in a sifting-match diagram (dim, same as frame).
 */
export const TREE_GLUE_STYLE = "\x1b[2m";

/**
 * A cycling palette of ANSI colors for role-based highlighting in sifting-match diagrams.
 *
 * Six bright colors that are visually distinguishable on both dark and light terminals.
 * If a sifting pattern has more than six roles, the palette cycles.
 */
export const ROLE_COLOR_PALETTE: readonly string[] = [
    "\x1b[92m",
    "\x1b[93m",
    "\x1b[94m",
    "\x1b[95m",
    "\x1b[96m",
    "\x1b[91m",
];

/**
 * Classification of a node in a sifting-match diagram's spanning tree.
 */
export enum NodeClassification {
    Glue = "glue",
    Matched = "matched",
    Pruned = "pruned",
}
