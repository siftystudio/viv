import type {
    ConstructSiftingMatchDiagramArgs,
    ConstructSiftingMatchDiagramResult,
    ConstructTreeDiagramArgs,
    ConstructTreeDiagramResult
} from "./dto";
import { EntityType } from "../adapter";
import { ValidationErrorSubject, VivNotInitializedError, VivValidationError } from "../errors";
import { GATEWAY } from "../gateway";
import { DEFAULT_ANCHOR_MARKER, constructSiftingMatchDiagram, constructTreeDiagram } from "../analysis";
import { isEntityOfType, isString } from "../utils";
import { vivRuntimeIsInitializedAPI } from "./init";

/**
 * Returns a *causal tree diagram* that is anchored in a given action, displaying the entire
 * causal structure rooted in the action's causal primogenitor(s).
 *
 * This diagram will include every action that is causally related to the given one, either as an ancestor,
 * a descendant, or a collateral relative. Rather than a tree, the diagram will technically be structured
 * as a *directed acyclic graph* (DAG), the roots of which are all the actions that are causally related
 * to the given one and have no direct causes. The leaves will be actions that caused no other actions.
 * Multiple roots obtain when the anchor (or an ancestor) is directly caused by actions from two or more
 * lineages that do not share a common ancestor.
 *
 * As a concrete example, imagine a story about a prison escape, where two inmates scheme together to devise
 * a clever escape plan, which succeeds. In a Viv-powered simulation, the two inmates might have each been
 * sent to prison as a result of distinct complex emergent storylines that are themselves causal trees.
 *
 * When the characters decide to scheme together, that action could have *both* of the backstory trees as
 * causal lineages, meaning the two trees converged into one node. And as the escape plays out, with its
 * own upshot and ramifications, those downstream emergent storylines would themselves be trees that are
 * components of the larger one at play here. So multiple trees converge on one node, and that node then
 * spawns multiple distinct trees downstream from it.
 *
 * In any reasonably complex Viv project, and particularly ones that make proper use of reactions, these
 * trees can resemble a hyper-Pynchonian gnarl that challenges human interpretation -- but the tree will
 * be made of smaller trees that correspond more directly to conventional storylines.
 *
 * In the tree diagram, each node is identified in a compact notation combining a family-letter prefix
 * with a numeric identifier. The family-letter prefix corresponds to one of the root actions in the
 * tree (DAG). While an action node can of course have multiple root ancestors, it will be associated
 * with the one in whose subtree it first appears. Later references to the same action will reuse
 * that same identifier, in a *back reference* (see below).
 *
 * Here's a breakdown on the notation used in the diagrams:
 *   - Box-drawing characters mark the contours of the tree structure.
 *   - Each action is given a compact identifier of the form `<family-letter><number>`.
 *   - The anchor action is marked with a special character (defaults to `*`).
 *   - Linear chains (terminal sequences of single-child actions) are collapsed into `→`-separated runs.
 *   - Back references of the form `[=identifier]` are used for actions that have already appeared in
 *     the diagram, above where the back reference is used.
 *   - A legend below the diagram maps each compact identifier to the actual action {@link UID}.
 *
 * @category Analysis
 * @example
 * ```ts
 * const diagram = await constructTreeDiagram({ actionID: "aid-1234", ansi: true });
 * console.log(diagram);
 * ```
 * @example
 * ```
 * commit-robbery [a1]
 * └─ get-sentenced [a2]
 *    └─ meet-in-yard [a3]
 *       └─ * scheme-together [a4]
 *          └─ attempt-escape [a5]
 *             ├─ flee-country [a6] → cross-border [a7] → reach-safehouse [a8]
 *             └─ launch-manhunt [a9] → set-up-roadblocks [a10]
 *
 * commit-fraud [b1]
 * └─ get-sentenced [b2]
 *    └─ meet-in-yard [=a3]
 *
 * ┌────────────────────────┐
 * │ a1  : aid-9f2a3b7c     │
 * │ a2  : aid-4d8e1f3a     │
 * │ a3  : aid-7b2c9d4e     │
 * │ *a4 : aid-1234         │
 * │ a5  : aid-6c3d7a9b     │
 * │ a6  : aid-8e4f2a1c     │
 * │ a7  : aid-3b9d6e5f     │
 * │ a8  : aid-5a1c8d2e     │
 * │ a9  : aid-2f7b4a3d     │
 * │ a10 : aid-9d3e6f1a     │
 * │ b1  : aid-4a8b2c7d     │
 * │ b2  : aid-7f1d5e9a     │
 * └────────────────────────┘
 * ```
 * @param args - See {@link ConstructTreeDiagramArgs}.
 * @returns See {@link ConstructTreeDiagramResult}.
 * @throws {@link VivNotInitializedError} If Viv has not been initialized.
 * @throws {@link VivValidationError} If `actionID` is not a valid entity ID for an action.
 */
export async function constructTreeDiagramAPI(args: ConstructTreeDiagramArgs): Promise<ConstructTreeDiagramResult> {
    // Confirm that Viv has been initialized
    if (!vivRuntimeIsInitializedAPI()) {
        throw new VivNotInitializedError(
            `Cannot get tree diagram for action '${args.actionID}' (Viv has not been initialized)`
        );
    }
    // Validate the action ID
    if (!isString(args.actionID) || !(await GATEWAY.isEntityID(args.actionID))) {
        throw new VivValidationError(
            "Cannot get tree diagram",
            ValidationErrorSubject.APICall,
            [`actionID is not an entity ID: '${args.actionID}'`]
        );
    }
    if (!(await isEntityOfType(args.actionID, EntityType.Action))) {
        throw new VivValidationError(
            "Cannot get tree diagram",
            ValidationErrorSubject.APICall,
            [`actionID is not an entity ID for an action: '${args.actionID}'`]
        );
    }
    // Unpack args, apply defaults, and dispatch to the core implementation
    return await constructTreeDiagram(
        args.actionID,
        args.formatLabel ?? null,
        args.anchorMarker ?? DEFAULT_ANCHOR_MARKER,
        args.ansi ?? false,
        args.maxChildren ?? Infinity
    );
}

/**
 * Returns a *sifting-match diagram* that visualizes a match for a sifting pattern.
 *
 * The diagram constructed here is a causal tree diagram similar to what {@link constructTreeDiagram} returns,
 * except in this case all the actions matched by the sifting pattern will be named nodes, whereas in a
 * {@link constructTreeDiagram} only a single anchor action is named. Moreover, the diagram will include
 * all ancestors, descendants, and collateral relatives for *each* of the actions matched by the pattern. As
 * a result, sifting-match diagrams cover more ground, and thus by default make heavy use of elision, where
 * entire subtrees are collapsed using *elision indicators* of the form `⋮ (N)`.
 *
 * The position of each elision indicator tells you what has been collapsed:
 *
 * - Above a root: `N` ancestors of the root.
 * - Between two matched actions: `N` intermediate actions on the direct causal path between them.
 * - Sibling of a matched action: a sibling and its `N-1` descendants.
 * - Below a leaf: `N` descendants of the leaf.
 *
 * When a matched action has causal ancestors arriving via a separate lineage (from the one
 * marked by the edge from its parent), a *convergence indicator* appears above it:
 *
 * - `[⋯shortID] ⋮ (N)`: `N` ancestors arrive from the lineage of a named ancestor visible
 *   elsewhere in the diagram.
 * - `─┼ ⋮ (N)`: `N` ancestors arrive from a lineage with no named ancestor in the diagram.
 *
 * Matched actions are labeled with their sifting-pattern role in parentheses, e.g.,
 * `vow-revenge (turning-point) [a7]`. In ANSI mode, each role gets a distinct color
 * from a cycling palette.
 *
 * Finally, as in {@link constructTreeDiagram}, the diagram is technically a *directed acyclic graph*
 * (DAG), may be presented with multiple distinct subtrees, and may make use of back references.
 *
 * @category Analysis
 * @example
 * ```ts
 * const siftingMatch = await runSiftingPattern({ patternName: "mutiny" });
 * if (match) {
 *     const diagram = await constructSiftingMatchDiagram({ siftingMatch, ansi: true });
 *     console.log(diagram);
 * }
 * ```
 * @example
 * ```
 * ⋮ (31)
 * └─ insult-crew-member (buildup) [a1]
 *    ⋮ (4)
 *    └─ recruit-conspirators (buildup) [a2]
 *       ⋮ (3)
 * [⋯a1] ⋮ (7)
 *    ─┼ ⋮ (14)
 *       └─ attempt-mutiny (mutiny) [a3]
 *          └─ captain-defeats-mutiny (mutiny) [a4]
 *             └─ maroon-on-island (aftermath) [a5]
 *                ⋮ (74)
 *                └─ signal-passing-ship (aftermath) [a6]
 *                   └─ board-ship (aftermath) [a7]
 *                      ⋮ (512)
 *
 * ⋮ (8)
 * └─ cut-crew-rations (buildup) [b1]
 *    ⋮ (2)
 *    └─ recruit-conspirators [=a2]
 *
 * ┌──────────────────────┐
 * │ a1 : aid-f8a3b2c7    │
 * │ a2 : aid-2d4e6f8a    │
 * │ a3 : aid-k1l2m3n4    │
 * │ a4 : aid-u1v2w3x4    │
 * │ a5 : aid-e1f2a3b4    │
 * │ a6 : aid-4b6c8d0e    │
 * │ a7 : aid-l4m5n6o7    │
 * │ b1 : aid-m9n0o1p2    │
 * └──────────────────────┘
 * ```
 * @param args - See {@link ConstructSiftingMatchDiagramArgs}.
 * @returns See {@link ConstructSiftingMatchDiagramResult}.
 * @throws {@link VivNotInitializedError} If Viv has not been initialized.
 * @throws {@link VivValidationError} If the sifting match is empty or contains invalid action IDs.
 */
export async function constructSiftingMatchDiagramAPI(
    args: ConstructSiftingMatchDiagramArgs
): Promise<ConstructSiftingMatchDiagramResult> {
    // Confirm that Viv has been initialized
    if (!vivRuntimeIsInitializedAPI()) {
        throw new VivNotInitializedError(
            "Cannot construct sifting-match diagram (Viv has not been initialized)"
        );
    }
    // Validate the sifting match: must have at least one action
    const allActionIDs: string[] = [];
    for (const roleName of Object.keys(args.siftingMatch)) {
        for (const actionID of args.siftingMatch[roleName]) {
            allActionIDs.push(actionID);
        }
    }
    if (allActionIDs.length === 0) {
        throw new VivValidationError(
            "Cannot construct sifting-match diagram",
            ValidationErrorSubject.APICall,
            ["The sifting match contains no action IDs"]
        );
    }
    // Validate each action ID
    for (const actionID of allActionIDs) {
        if (!isString(actionID) || !(await GATEWAY.isEntityID(actionID))) {
            throw new VivValidationError(
                "Cannot construct sifting-match diagram",
                ValidationErrorSubject.APICall,
                [`Not an entity ID: '${actionID}'`]
            );
        }
        if (!(await isEntityOfType(actionID, EntityType.Action))) {
            throw new VivValidationError(
                "Cannot construct sifting-match diagram",
                ValidationErrorSubject.APICall,
                [`Not an action: '${actionID}'`]
            );
        }
    }
    // Unpack args, apply defaults, and dispatch to the core implementation
    return await constructSiftingMatchDiagram(
        args.siftingMatch,
        args.formatLabel ?? null,
        args.ansi ?? false,
        args.maxChildren ?? Infinity,
        args.elide ?? true
    );
}
