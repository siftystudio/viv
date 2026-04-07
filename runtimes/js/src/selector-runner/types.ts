import type { ActionName, PlanName, SelectorName } from "../content-bundle/types";
import type { Expression, PrecastBindings } from "../dsl/types";
import type { RoleCastingResultSuccess } from "../role-caster/types";

/**
 * A candidate that may be targeted via a selector.
 */
export interface SelectorCandidate {
    /**
     * The name of the candidate, i.e., the name of the construct to target.
     */
    readonly name: ActionName | PlanName | SelectorName;
    /**
     * Whether the candidate is a selector. The compiler ensures that action selectors can only
     * target other action selectors, and that plan selectors can only target other plan selectors.
     */
    readonly isSelector: boolean;
    /**
     * Precast bindings for the candidate, as asserted in the selector definition.
     */
    readonly bindings: PrecastBindings;
    /**
     * If applicable, an expression that will evaluate to the weight for this candidate, which will be
     * used as part of a weighted random sort procedure (see {@link SelectorPolicy}).
     */
    readonly weight: Expression | null;
}

/**
 * The result of running an action selector or plan selector.
 */
export type SelectorResult = SelectorResultSuccess | SelectorResultFailure;

/**
 * A result from a successful instance of running an action selector or plan selector.
 */
export interface SelectorResultSuccess {
    /**
     * The name of the action or plan successfully targeted via the selector, if any, else `null`.
     * Note that this construct will never be a selector, because recursive selector sequences are
     * always fully resolved in the course of producing a result.
     */
    readonly selectedConstructName: ActionName | PlanName;
    /**
     * The role-casting result associated with successful targeting of an actual action or plan via
     * the selector. If no action or plan is successfully targeted, this role-casting data will
     * be associated with a failure point.
     */
    readonly roleCastingResult: RoleCastingResultSuccess;
}

/**
 * A result from a failed instance of running an action selector or plan selector.
 */
export interface SelectorResultFailure {
    /**
     * The name of the action or plan successfully targeted via the selector, if any, else `null`.
     * Note that this construct will never be a selector, because recursive selector sequences are
     * always fully resolved in the course of producing a result.
     */
    readonly selectedConstructName: null;
}
