import type { UID, HostApplicationAdapter, VivInternalStateDebugging } from "../adapter/types";
import type { ActionName, PlanName, QueryName, SiftingPatternName } from "../content-bundle/types";
import type { RoleBindings } from "../role-caster/types";
import type { SiftingMatch } from "../story-sifter/types";

/**
 * Arguments parameterizing a request to force a specific action to be attempted and/or performed.
 *
 * @category Other
 * @remarks These are the effective arguments to {@link attemptAction}.
 */
export interface AttemptActionArgs {
    /**
     * The name of the action to attempt.
     */
    readonly actionName: ActionName;
    /**
     * Entity ID for the character who will attempt the action.
     *
     * If elided, characters will be shuffled, and each will attempt the action in turn. If this
     * field is set, the same entity ID must appear in the initial role in `precastBindings`.
     *
     * Note: The runtime will confirm that this is an entity ID for a character.
     */
    readonly initiatorID?: UID;
    /**
     * Partial or complete role bindings to use when targeting the action.
     *
     * If both `initiatorID` and this field are present, `initiatorID` must be bound to the initiator role
     * here. If there are any required role slots that have not been precast here, the role caster will
     * attempt to fill them, and targeting will fail if they cannot be filled (though see `suppressConditions`).
     * Likewise, the role caster will also attempt to fill any unfilled optional role slots.
     */
    readonly precastBindings?: RoleBindings;
    /**
     * An array containing entity IDs for arbitrary actions that the host application
     * has indicated as causes of the action about to be performed.
     *
     * This parameter supports a design pattern in which a host application captures player activity Viv
     * actions. In such a design, the host application might reason about the causes of player activity,
     * to identify which NPC actions led to the behaviors that are being represented as simulation actions
     * via the call here.
     *
     * It can also support a design pattern where something like a drama manager decides that it would be
     * desirable if an action that did not occur actually had occurred -- for instance, a character affronted
     * another one, who could have concocted a revenge scheme that fits nicely in a larger central narrative,
     * but they did not happen to queue `plot-revenge` as a reaction. The drama manager could intervene by
     * effectively forcing `plot-revenge` with the original affronting action as its cause, which means story
     * sifting could work per usual over the causal line.
     *
     * Note: The runtime will confirm that each entry here is in fact the entity ID for some action,
     * and it will also deduplicate the given causes automatically.
     */
    readonly causes?: UID[];
    /**
     * A flag specifying that the action conditions should be ignored when targeting the action.
     *
     * In such cases, the action can effectively be forced to occur, so long as the role caster is able to find
     * enough entities to fill each required role slot. For instance, if `precastBindings` does not cover all
     * required role slots, and if a given role with an open slot requires nearby characters, and if there are
     * not enough characters near the initiator, then targeting could fail even though this flag was set here.
     * In other words, the flag doesn't force an action to occur, but rather prevents condition failure from
     * thwarting actions for which casts could otherwise be assembled.
     *
     * Note that the flag only suppresses the `conditions` field of the action at hand. Any implied conditions
     * in concerns like casting-pool declarations will still be honored.
     *
     * This field should always be `true` when present.
     *
     * @defaultValue false
     */
    readonly suppressConditions?: true;
}

/**
 * If the attempted action was successfully performed, its entity ID, else `null`.
 *
 * @category Other
 * @remarks This is the return value for {@link attemptAction}.
 */
export type AttemptActionResult = UID | null;

/**
 * Arguments parameterizing a request to construct a causal tree diagram.
 *
 * @category Analysis
 * @remarks These are the effective arguments to {@link constructTreeDiagram}.
 */
export interface ConstructTreeDiagramArgs {
    /**
     * Entity ID for the anchor action.
     *
     * The diagram will render the complete causal tree containing this action,
     * and the anchor will be highlighted with `anchorMarker` (or a default).
     */
    readonly actionID: UID;
    /**
     * An optional callback that renders the label for each node in the diagram.
     *
     * The callback receives the action's entity ID, and should return a string to use
     * as the node label. If omitted, the action name will be used as the label.
     *
     * The callback must be synchronous.
     *
     * @param actionID - The entity ID for the action to produce a label for.
     * @returns A label for a tree node for the given action.
     */
    readonly formatLabel?: (actionID: UID) => string;
    /**
     * The string used to mark the anchor action in the diagram.
     *
     * If the default collides with text produced by the `formatLabel` callback, a more distinctive
     * marker can be supplied here. Otherwise, the default value here will not appear elsewhere in
     * the diagram (making it easy to search for the anchor action).
     *
     * @defaultValue "*"
     */
    readonly anchorMarker?: string;
    /**
     * Whether to include ANSI escape codes for stylized text display in terminal settings.
     *
     * When enabled, certain elements will be displayed in color and/or with other style.
     *
     * @defaultValue false
     */
    readonly ansi?: boolean;
    /**
     * The maximum number of children to render per node.
     *
     * When a node has more children than this limit, the excess members are replaced with an
     * indicator showing the number of hidden siblings among the node's children.
     *
     * If omitted, all children are rendered.
     *
     * @defaultValue Infinity
     */
    readonly maxChildren?: number;
}

/**
 * A string containing a causal tree diagram rendered in a human-readable text format.
 *
 * If requested, the string will contain ANSI escape codes (for color and other style).
 *
 * @category Analysis
 * @remarks This is the return value for {@link constructTreeDiagram}.
 */
export type ConstructTreeDiagramResult = string;

/**
 * Arguments parameterizing a request to construct a sifting-match diagram.
 *
 * @category Analysis
 * @remarks These are the effective arguments to {@link constructSiftingMatchDiagram}.
 */
export interface ConstructSiftingMatchDiagramArgs {
    /**
     * The sifting match to visualize, as returned by {@link runSiftingPattern}.
     */
    readonly siftingMatch: SiftingMatch;
    /**
     * An optional callback that renders the label for each node in the diagram.
     *
     * The callback receives the action's entity ID, and should return a string
     * to use as the node label. If omitted, the action name is used as the label.
     *
     * The callback must be synchronous.
     */
    readonly formatLabel?: (actionID: UID) => string;
    /**
     * Whether to include ANSI escape codes for terminal highlighting.
     *
     * When enabled, matched actions are styled in role-specific colors and glue
     * actions are dimmed.
     *
     * @defaultValue false
     */
    readonly ansi?: boolean;
    /**
     * Maximum number of children to render per node.
     *
     * If omitted, all children are rendered.
     *
     * @defaultValue Infinity
     */
    readonly maxChildren?: number;
    /**
     * Whether to elide unmatched actions from the diagram.
     *
     * When enabled (by default), only the actions matched by the sifting pattern are rendered as named
     * nodes in the tree diagram -- all other actions will be marked by *elision indicators*, as described
     * in {@link constructSiftingMatchDiagram}.
     *
     * When disabled, the full causal spanning tree connecting all matched actions is rendered, with every
     * intermediate (glue) action visible.
     *
     * **Warning:** In large simulations, a spanning tree may contain many thousands of actions,
     * so take care before setting this to `false`.
     *
     * @defaultValue true
     */
    readonly elide?: boolean;
}

/**
 * A string containing a sifting-match diagram rendered in a human-readable text format.
 *
 * @category Analysis
 * @remarks This is the return value for {@link constructSiftingMatchDiagram}.
 */
export type ConstructSiftingMatchDiagramResult = string;

/**
 * Debugging data stored in the Viv runtime's internal state.
 *
 * @category Other
 * @remarks This is the return value for {@link getDebuggingData}.
 */
export type GetDebuggingDataResult = VivInternalStateDebugging;

/**
 * The supported Viv content-bundle schema version supported by this runtime,
 * which is a string in semver notation (e.g., `"1.0.16"`).
 *
 * @category Other
 * @remarks This is the return value for {@link getSchemaVersion}.
 */
export type GetSchemaVersionResult = string;

/**
 * Arguments associated with initialization of the Viv runtime.
 *
 * @category Other
 * @remarks These are the effective arguments for {@link initializeVivRuntime}.
 */
export interface InitializeVivRuntimeArgs {
    /**
     * A Viv compiled content bundle, as emitted by the Viv compiler. The type is treated as
     * `unknown` until its shape can be confirmed, but a `ContentBundle` should be supplied.
     */
    readonly contentBundle: unknown;
    /**
     * The Viv adapter for the host application at hand.
     */
    readonly adapter: HostApplicationAdapter;
}

/**
 * A success signal, `true`, indicating that the Viv runtime has been initialized successfully.
 *
 * @category Other
 * @remarks This is the return value for {@link initializeVivRuntime}.
 */
export type InitializeVivRuntimeResult = true;

/**
 * Arguments parameterizing a request to force queueing of a specific plan, potentially urgently.
 *
 * Note: No initiator is specified here because, unlike actions, plans are executed globally without
 * regard to any single character. Indeed, plans can orchestrate actions that will be initiated by
 * distinct characters. This is why queued plans live in a global plan queue (stored in the
 * {@link VivInternalState}), as opposed to character-specific queues (as with queued actions).
 *
 * @category Other
 * @remarks These are the effective arguments to {@link queuePlan}.
 */
export interface QueuePlanArgs {
    /**
     * The name of the plan to queue.
     */
    readonly planName: PlanName;
    /**
     * Whether to queue the plan *urgently*.
     *
     * If this flag is set, the planner will immediately target the plan upon queueing it. If this initial
     * targeting succeeds, the plan will be launched immediately and then greedily executed to the degree
     * possible, up to potential resolution. This matches the behavior that occurs when a reaction queues
     * a plan (or plan selector) with a truthy `urgent` value.
     *
     * If the flag is *not* set, the planner will queue the plan immediately, but will not attempt to
     * target it until the next {@link tickPlanner}.
     *
     * Note: This should always be `true` when present.
     *
     * @defaultValue false
     */
    readonly urgent?: true;
    /**
     * Partial or complete role bindings to use when targeting the plan.
     *
     * If there are any required role slots that have not been precast here, the role caster will attempt
     * to fill them, and targeting will fail if they cannot be filled. Likewise, the role caster will also
     * attempt to fill any unfilled optional role slots.
     */
    readonly precastBindings?: RoleBindings;
    /**
     * An array containing entity IDs for arbitrary actions that the host application has indicated as causes
     * for the plan being queued. If the plan ultimately directly causes any actions to be performed, these will
     * be attributed as the causes of those actions.
     *
     * See the documentation for {@link AttemptActionArgs} for examples of design patterns enabled by this parameter.
     *
     * Note: The runtime will confirm that each entry here is in fact the entity ID for some action,
     * and it will also deduplicate the given causes automatically.
     */
    readonly causes?: UID[];
}

/**
 * The UID for the queued plan, which can be used to monitor its `QueuedConstructStatus`
 * and to retrieve its `PlanState` once the plan launches.
 *
 * @category Other
 * @remarks This is the return value for {@link queuePlan}.
 */
export type QueuePlanResult = UID;

/**
 * Arguments parameterizing a request to run a specified search query.
 *
 * @category Other
 * @remarks These are the effective arguments to {@link runSearchQuery}.
 */
export interface RunSearchQueryArgs {
    /**
     * The name of the query to run.
     */
    readonly queryName: QueryName;
    /**
     * Partial or complete role bindings to use when running the search query.
     */
    readonly precastBindings?: RoleBindings;
    /**
     * The entity ID for a character whose memories will serve as the search domain, if any.
     *
     * When this field is present, the search query is run against the given character's memories,
     * and otherwise the pattern is run against the entire chronicle -- meaning all actions that have
     * ever occurred in the simulation instance at hand. If the specified search query uses memory
     * criteria (the `salience` and/or `associations` fields), an error will be thrown if a search
     * domain is not provided.
     */
    readonly searchDomain?: UID;
    /**
     * The maximum number of query matches to return.
     *
     * If omitted, all matches are returned.
     *
     * Integers are most sensible, and any value here must be greater than or equal to one.
     */
    readonly limit?: number;
}

/**
 * An array containing zero or more matches for the search query that was run.
 *
 * Each entry in the array is the entity ID for an action matching the query.
 *
 * @category Other
 * @remarks This is the return value for {@link runSearchQuery}.
 */
export type RunSearchQueryResult = UID[];

/**
 * Arguments parameterizing a request to run a specified sifting pattern.
 *
 * @category Other
 * @remarks These are the effective arguments to {@link runSiftingPattern}.
 */
export interface RunSiftingPatternArgs {
    /**
     * The name of the sifting pattern to run.
     */
    readonly patternName: SiftingPatternName;
    /**
     * Partial or complete role bindings to use when running the sifting pattern.
     */
    readonly precastBindings?: RoleBindings;
    /**
     * The entity ID for a character whose memories will serve as the search domain.
     *
     * When this field is present, the sifting pattern is run against the given character's memories,
     * and otherwise the pattern is run against the entire chronicle (meaning all actions that have
     * ever occurred in the simulation instance at hand).
     */
    readonly searchDomain?: UID;
}

/**
 * A single match for the sifting pattern that was run, if there was one, else `null`.
 *
 * A sifting match takes the form of a mapping from role names to arrays of entity IDs, where the role
 * names correspond to the action roles defined in the sifting pattern's `actions` field, and the entity
 * IDs are the actions that were cast in those roles in the course of constructing the sifting match.
 *
 * @category Other
 * @remarks This is the return value for {@link runSiftingPattern}.
 */
export type RunSiftingPatternResult = SiftingMatch | null;

/**
 * Arguments parameterizing a request to carry out action selection on behalf of the given character.
 *
 * @category Other
 * @remarks These are the effective arguments to {@link selectAction}.
 */
export interface SelectActionArgs {
    /**
     * Entity ID for the character for whom action selection will be undertaken. Should an action be
     * performed as a result, this character will be cast in its initiator role.
     */
    readonly initiatorID: UID;
    /**
     * Whether to exclusively target queued actions or action selectors
     * marked urgent (in the given initiator's queue).
     *
     * If this flag is set, *only* urgent queued actions will be targeted, and action selection will fail
     * if no urgent queued actions exist or none are successfully performed.
     *
     * If the flag is *not* set, the action manager will also target each of the character's non-urgent
     * queued actions, if any. And if there are none of those, or if none are successfully performed,
     * the action manager will then attempt to perform a general action, meaning one that is defined
     * in the Viv content bundle and is not marked `reserved`. If any action is successfully performed,
     * this function will return its entity ID, else `null`.
     *
     * This enables a simulation pattern whereby characters target urgent actions once a timestep
     * has otherwise completed, to allow for emergent sequences to fully play out.
     *
     * Note: This should always be `true` when present.
     *
     * @defaultValue false
     */
    readonly urgentOnly?: true;
}

/**
 * If an action was successfully performed, its entity ID, else `null`.
 *
 * @category Other
 * @remarks This is the return value for {@link selectAction}.
 */
export type SelectActionResult = UID | null;

/**
 * Whether the Viv runtime has been initialized successfully.
 *
 * @category Other
 * @remarks This is the return value for {@link vivRuntimeIsInitialized}.
 */
export type VivRuntimeIsInitializedResult = boolean;
