import type { CharacterView, DiegeticTimestamp, TimeOfDay, UID } from "../adapter/types";
import type { ConstructDefinition, RoleName } from "../content-bundle/types";
import type { EvaluationContext } from "../interpreter/types";
import type { ConstructDiscriminator } from "../content-bundle";

/**
 * The result of an instance of role casting.
 */
export type RoleCastingResult = RoleCastingResultSuccess | RoleCastingResultFailure;

/**
 * A result from a successful instance of role casting.
 */
export interface RoleCastingResultSuccess {
    /**
     * If targeting succeeded, the valid final bindings, else `null`.
     */
    readonly bindings: RoleBindings;
    /**
     * The final evaluation context following successful targeting.
     */
    readonly evaluationContext: EvaluationContext;
}

/**
 * A result from a failed an instance of role casting.
 */
export interface RoleCastingResultFailure {
    /**
     * If targeting succeeded, the valid final bindings, else `null`.
     */
    readonly bindings: null;
}

/**
 * A collection of data that is required across various functions associated with role casting,
 * collected here in lieu of having large, repetitive signatures on the functions.
 */
export interface RoleCastingData extends DynamicRoleCastingData  {
    /**
     * Definition for the construct being targeted.
     */
    readonly constructDefinition: ConstructDefinition;
    /**
     * Precast (partial) bindings asserted prior to targeting, if any, else an empty object.
     *
     * These bindings must be honored as a subset of any bindings constructed during targeting.
     */
    readonly precastBindings: RoleBindings;
    /**
     * A simple cache storing data that would otherwise be recomputed frequently during a given
     * instance of targeting some construct.
     */
    readonly targetingCache: TargetingInstanceCache;
    /**
     * For action targeting, a cache containing data that only needs to be reset between prospective initiators.
     *
     * Its life cycle is implemented by the action manager, but all the updates are made during
     * role casting. If we're not targeting an action, this is `null`.
     */
    readonly initiatorLevelCache?: InitiatorLevelCache;
    /**
     * Whether to ignore the action conditions during role casting.
     *
     * This supports the public API function {@link attemptActionAPI}, which allows
     * callers to effectively force an action.
     */
    readonly suppressConditions?: boolean;
}

/**
 * The dynamic fields in role-casting data.
 *
 * These are copied and mutated as the binding process proceeds, and earlier copies
 * are restored as backtracking occurs.
 */
export interface DynamicRoleCastingData {
    /**
     * The current (partial) bindings constructed so far.
     *
     * As targeting proceeds, these bindings grow and contract as casting and backtracking occurs.
     */
    currentBindings: RoleBindings;
    /**
     * The current Viv evaluation context, derived from the current bindings.
     */
    evaluationContext: EvaluationContext;
}

/**
 * Role casting data with a specific shape that is present iff we are targeting an action or a selector.
 */
export interface ActionOrSelectorRoleCastingData extends RoleCastingData  {
    /**
     * Definition for the action or selector being targeted.
     */
    readonly constructDefinition: Extract<
        ConstructDefinition,
        { type: ConstructDiscriminator.Action | ConstructDiscriminator.ActionSelector }
    >;
    /**
     * A cache containing data that only needs to be reset between prospective initiators.
     *
     * Its life cycle is implemented by the action manager, but all the updates are made during role casting.
     */
    readonly initiatorLevelCache: InitiatorLevelCache;
}

/**
 * A mapping from a role name to an array of binding candidates cast in that role.
 *
 * Note that the actual arrays must be homogeneous in terms of type: only a symbol role may
 * take symbol bindings, and symbol roles only allow symbol bindings. But from a TypeScript
 * perspective, it's easiest to union over the element type here.
 *
 * @category Other
 */
export type RoleBindings = Record<RoleName, RoleCandidate[]>;

/**
 * The possible types that may be bound to a role.
 *
 * @category Other
 */
export type RoleCandidate = UID | SymbolRoleBinding;

/**
 * Union containing the possible types for symbol-role bindings.
 *
 * *This is an internal type that is not part of the stable API surface. Its shape may change in any release.*
 *
 * @internal
 * @category Other
 */
export type SymbolRoleBinding =
    | string
    | number
    | boolean
    | null
    | Record<string, unknown>
    | unknown[];

/**
 * A simple store that caches data that is frequently required during a given instance of targeting.
 */
export interface TargetingInstanceCache {
    /**
     * An object mapping a role name to an associated cached candidate pool.
     */
    pools: Record<RoleName, RoleCandidate[]>;
    /**
     * An object associating role candidates with the role names for which they are blacklisted, i.e., for which
     * they cannot possibly be cast in the current setting.
     *
     * For singleton roles taking entities as candidates, the key will be the entity ID. For symbol roles,
     * it will be the string representation of the symbol value. For quorum roles (ones with a `min` greater
     * than `1`), it will be the concatenation of the string representations of the candidates making up
     * the quorum, with the candidates being sorted beforehand.
     */
    blacklists: Record<string, Record<RoleName, true>>;
}

/**
 * A simple store that caches data that is frequently required during action selection for a given initiator.
 *
 * Its life cycle is implemented by the action manager, but all the updates are made during
 * role casting, via in-place mutation.
 */
export interface InitiatorLevelCache {
    /**
     * Entity data for the prospective initiator of the action being targeted.
     */
    initiatorData: CharacterView;
    /**
     * Roughly speaking, the current timestamp (in story time) in the host application's
     * running simulation instance.
     *
     * This value is only re-computed between initiators, and in general, Viv is not meant to deal
     * precisely in matters of time. This is `null` until first needed.
     *
     * Note: A queued action with time-period temporal constraints will be dequeued only if the closing
     * time has *passed*, meaning the action could still be performed at precisely that timestamp
     */
    currentTimestamp: DiegeticTimestamp | null;
    /**
     * Roughly speaking, the current time of day (in story time) in the host application's
     * running simulation instance.
     *
     * This value is only re-computed between initiators, and in general, Viv is not meant
     * to deal precisely in matters of time. This is `null` until first needed.
     */
    currentTimeOfDay: TimeOfDay | null;
    /**
     * Array containing entity IDs for all characters near the initiator.
     *
     * This is `null` until first needed.
     */
    nearbyCharacterIDs: UID[] | null;
    /**
     * Array containing entity IDs for all items near the initiator.
     *
     * This is `null` until first needed.
     */
    nearbyItemIDs: UID[] | null;
}
