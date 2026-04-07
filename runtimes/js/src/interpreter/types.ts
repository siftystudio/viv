import type { EntityView, TimeOfDay, UID } from "../adapter/types";
import type { ConstructName, RoleName } from "../content-bundle/types";
import type { VariableName } from "../dsl/types";
import type { CharacterMemory } from "../knowledge-manager/types";
import type { SymbolRoleBinding } from "../role-caster/types";
import type { SearchDomain } from "../story-sifter/types";
import type { SpecialRoleName } from "../action-manager";
import type { ConstructDiscriminator } from "../content-bundle";

/**
 * A Viv evaluation context, which is a data structure that is needed by the
 * interpreter to evaluate Viv expressions at runtime.
 */
export type EvaluationContext =
    EvaluationContextSpecialFields &
    EvaluationContextSpecialRoleBindings &
    EvaluationContextSingletonRoleBindings;

/**
 * Special fields that may be present in evaluation contexts.
 */
interface EvaluationContextSpecialFields {
    /**
     * For all *group roles* in the action, meaning ones with multiple slots (max\>1), this maps
     * the name of the group role to an array containing either IDs for all entities cast in the role
     * or the literal values in the case of a symbol role.
     *
     * Note that optional singleton roles (min=0, max=1) are not considered group roles and thus are
     * not stored here. Also note that the actual arrays will be homogeneous in terms of type: only
     * a symbol role may take symbol bindings, and symbol roles only allow symbol bindings. But from
     * a TypeScript perspective, it's easiest to union over the element type here.
     */
    readonly __groups__: Record<RoleName, GroupMember[]>;
    /**
     * A temporary store for reading and writing local variables, whose lifespan is limited to the
     * execution of post-hoc action material, like scratch operations, effects, and reactions.
     *
     * Viv authors usually create local variables in loop bodies, where they are transient only within
     * the loop scope. Local variables are also used to compute saliences and assocations.
     */
    readonly __locals__: Record<VariableName, ExpressionValue>;
    /**
     * An array containing entity IDs for all the actions that should be recorded as causes for
     * any reactions to the one at hand, should any be successfully performed in the future.
     *
     * We need to store these here to propagate them to the interpreter, since that module is
     * the one that ultimately evaluates reaction declarations to queue actions.
     */
    __causes__?: UID[];
    /**
     * A prepared search domain, ready for use in story sifting.
     *
     * A search domain must be present in order to execute a {@link ActionSearch} or a
     * {@link Sifting}, and we need to store this in the evaluation context to allow for
     * action searches and/or siftings that nest other action searches and/or siftings. In such cases,
     * we narrow the search domain to the intersection of the enclosing search domain and the search
     * domain specified for the nested action search or sifting.
     */
    __searchDomain__?: SearchDomain;
    /**
     * The type of construct that is current being targeted.
     *
     * This is used purely for debugging purposes, because it's often helpful in error messages to
     * identify the target construct at hand.
     */
    readonly __constructType__?: ConstructDiscriminator;
    /**
     * Name of the construct that is currently being targeted.
     *
     * This is used purely for debugging purposes, because it's often helpful in error messages to
     * identify the target construct at hand.
     */
    readonly __constructName__?: ConstructName;
}

/**
 * Entries for the Viv special roles `@this` and `@hearer`.
 *
 * `@this` is always bound to the entity ID for the action at hand, enabling an author to do things
 * like precast the action at hand in reaction bindings. This field is only set once the action has
 * been constructed, prior to the execution of effects and so forth.
 *
 * `@hearer` is always bound to the entity ID who is hearing about an action after the fact. This role is
 * only cast when a character participates in, observes, or learns about an action A2 that casts another
 * action A1 in one of its roles. In such cases, A2 is said to relay knowledge about A1. (Note that if A1
 * were to relay knowledge about another action A0, someone learning about A2 would not receive knowledge
 * about A0 -- in other words, knowledge relaying only works by one chain link at a time.) This role can
 * be referenced in effects, reactions, saliences, and associations, supporting patterns like queueing
 * a reaction to be performed by someone who hears about the action at hand. Note that a character who
 * directly participated in the original action will still be cast as `@hearer` if they are to hear
 * about the action via a subsequent one.
 */
type EvaluationContextSpecialRoleBindings = { [key in SpecialRoleName]?: UID };

/**
 * Catch-all for singleton role bindings that will be placed in an evaluation context, where the
 * role names are keys and various kinds of values (see below) may serve as property values.
 *
 * Note that only singleton roles (min=1, max=1) are hoisted into the top level. All group roles, including
 * optional singleton roles (min=0, max=1) are handled via the special `__groups__` property.
 */
type EvaluationContextSingletonRoleBindings = {
    [K in RoleName]?: SingletonRoleEvaluationContextValue;
};

/**
 * A union of possible types that the hoisted singleton-role top-level properties
 * in an evaluation context may take.
 *
 * Roles that cast entities will initially key an entity ID here, which is hydrated into entity data
 * as needed. This is done as an optimization during the role-casting phase, since upfront hydration
 * can be expensive in cases where entity data is stored in a DB. It also supports author ergonomics,
 * since an author can e.g. write a comparison like `@sender.boss == @receiver`, without worrying
 * whether the roles each store an entity ID. Because symbol roles may cast literal values, we
 * also need to include some literal types here.
 */
type SingletonRoleEvaluationContextValue =
    | UID  // ID for the entity cast in a singleton role, before hydration
    | EntityView  // Data for the entity cast in a singleton role, after hydration
    | SymbolRoleBinding;  // Literal value bound to a singleton symbol role

/**
 * Union containing the possible types for binding arrays associated with group roles.
 *
 * Note that a group role cannot mix entities and symbols, hence the union being over homogeneous arrays.
 */
export type GroupMember = UID | SymbolRoleBinding;

/**
 * Union containing the possible types for evaluated Viv expressions.
 *
 * @category Other
 */
export type ExpressionValue =
    | string
    | number
    | boolean
    | null
    | undefined  // E.g., return value for a function call, or a reference to a missing property
    | symbol  // The eval fail-safe sentinel
    | UID
    | EntityView
    | TimeOfDay
    | CharacterMemory
    | unknown[]  // E.g., list literals, function-call results
    | Record<string, unknown>;  // E.g., object literals, function-call results
