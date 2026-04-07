import type { CustomFunctionName } from "../adapter/types";
import type {
    CustomFunctionCall,
    Enum,
    EnumName,
    Expression,
    FloatField,
    IntField,
    ListField,
    LocalVariable,
    SetPredicate,
    StringField,
    TemplateStringField,
    TemporalConstraint,
    TimeDelta
} from "../dsl/types";
import type { PlanInstruction } from "../planner/types";
import type { SelectorCandidate } from "../selector-runner/types";
import type { SelectorPolicy } from "../selector-runner";
import type { ConstructDiscriminator, RoleEntityType, RoleParticipationMode } from "./constants";

/**
 * A content bundle in the format produced by the Viv compiler.
 */
export interface ContentBundle {
    /**
     * Metadata for the content bundle, which is currently used for validation purposes.
     */
    readonly metadata: ContentBundleMetadata;
    /**
     * Action definitions, keyed by name.
     */
    readonly actions: Record<ActionName, ActionDefinition>;
    /**
     * Action-selector definitions, keyed by name.
     */
    readonly actionSelectors: Record<SelectorName, ActionSelectorDefinition>;
    /**
     * Plan definitions, keyed by name.
     */
    readonly plans: Record<PlanName, PlanDefinition>;
    /**
     * Plan-selector definitions, keyed by name.
     */
    readonly planSelectors: Record<SelectorName, PlanSelectorDefinition>;
    /**
     * Query definitions, keyed by name.
     */
    readonly queries: Record<QueryName, QueryDefinition>;
    /**
     * Sifting-pattern definitions, keyed by name.
     */
    readonly siftingPatterns: Record<SiftingPatternName, SiftingPatternDefinition>;
    /**
     * Trope definitions, keyed by name.
     */
    readonly tropes: Record<TropeName, TropeDefinition>;
}

/**
 * Metadata on a compiled content bundle.
 *
 * This is intended to support validation during the initialization of a host application's Viv
 * adapter by, e.g., confirming that any referenced enums and custom functions actually exist.
 */
export interface ContentBundleMetadata {
    /**
     * The version number for the Viv content-bundle schema at the time of compiling this content bundle.
     *
     * The validator for the host application's Viv adapter enforce that this version is supported
     * by the present version of the runtime.
     */
    readonly schemaVersion: string;
    /**
     * The Viv compiler version at the time of compiling this content bundle, stored here
     * to give provenance as a potential aid to debugging.
     */
    readonly compilerVersion: string;
    /**
     * The Viv DSL grammar version at the time of compiling this content bundle, stored here
     * to give provenance as a potential aid to debugging.
     */
    readonly grammarVersion: string;
    /**
     * An array containing the names of all enums referenced in the content bundle.
     *
     * This is used for validation during the initialization of a host application's Viv adapter.
     */
    readonly referencedEnums: EnumName[];
    /**
     * An array containing the names of all custom functions referenced in the content bundle.
     *
     * This is used for validation during the initialization of a host application's Viv adapter.
     */
    readonly referencedFunctionNames: CustomFunctionName[];
    /**
     * An array specifying all reactions that are constrained by the time of day.
     *
     * This is used for validation during the initialization of a host application's Viv adapter.
     */
    readonly timeOfDayParameterizedReactions: TimeOfDayParameterizedReaction[];
    /**
     * An array specifying all queries that are parameterized by the time of day.
     *
     * This is used for validation during the initialization of a host application's Viv adapter.
     */
    readonly timeOfDayParameterizedQueries: QueryName[];
    /**
     * A flag indicating whether the content bundle has at least one assignment that modifies entity data.
     *
     * We include this here because such assignments are not allowed in all adapter configurations.
     */
    readonly hasEntityDataAssignments: boolean;
}

/**
 * A simple record of a case of reaction that is constrained by the time
 * of day, used for validation purposes.
 */
export interface TimeOfDayParameterizedReaction {
    /**
     * The type of the construct definition containing a reaction that is constrained by the time of day.
     */
    constructType: ConstructDiscriminator;
    /**
     * The name of the construct definition containing a reaction that is constrained by the time of day.
     */
    constructName: ActionName;
    /**
     * The name of the target construct of the reaction that is constrained by the time of day.
     */
    reaction: ActionName | SelectorName | PlanName;
}

/**
 * A Viv construct definition.
 */
export type ConstructDefinition =
    | ActionDefinition
    | ActionSelectorDefinition
    | QueryDefinition
    | PlanDefinition
    | PlanSelectorDefinition
    | SiftingPatternDefinition
    | TropeDefinition;

/**
 * A Viv construct name.
 */
export type ConstructName = ActionName | PlanName | QueryName | SelectorName | SiftingPatternName | TropeName;

/**
 * A definition for a Viv action.
 */
export interface ActionDefinition {
    /**
     * Discriminator for the action construct type.
     */
    readonly type: ConstructDiscriminator.Action;
    /**
     * The (unique) name of the action.
     */
    readonly name: ActionName;
    /**
     * Whether this action is reserved, in which case it may only be targeted via selector targeting or queueing.
     */
    readonly reserved: boolean;
    /**
     * Mapping from the names of the roles associated with this action to their respective role definitions.
     *
     * The roles appear in the order in which the author defined them.
     */
    readonly roles: Record<RoleName, RoleDefinition>;
    /**
     * The name of the initiator role, isolated here for optimization purposes.
     */
    readonly initiator: RoleName;
    /**
     * The names of the roles constituting the roots of the trees composing role-dependency
     * forest for this action definition.
     *
     * The roots are given in the order by which role casting will proceed.
     */
    readonly roleForestRoots: RoleName[];
    /**
     * An expression yielding a numeric importance score the action.
     */
    readonly importance: IntField | FloatField | Enum;
    /**
     * Tags on the action.
     *
     * These are meant to facilitate search over actions, for story sifting, and their function
     * may be extended in the host application.
     */
    readonly tags: ListField;
    /**
     * Definition for a simple templated string describing this action in a sentence or so.
     */
    readonly gloss: StringField | TemplateStringField | null;
    /**
     * Definition for a more detailed templated string describing this action in a paragraph or so.
     */
    readonly report: StringField | TemplateStringField | null;
    /**
     * Conditions for the action, grouped by role name (with the special global-conditions key).
     *
     * A condition is an expression that must hold (i.e., evaluate to a truthy value) in order
     * for the action to be performed.
     */
    readonly conditions: ConstructConditions;
    /**
     * An ordered set of expressions that prepare a set of temporary variables that may be
     * referenced downstream in the action definition.
     *
     * These temporary variables can be referenced by an author using the `$` sigil, but this is
     * syntactic sugar for `@this.scratch` -- e.g., `$&foo` is equivalent to `@this.scratch.foo`,
     * with the second sigil indicating the type of the scratch variable.
     */
    readonly scratch: Expression[];
    /**
     * An ordered set of expressions that, when executed, cause updates to the host application state.
     */
    readonly effects: WrappedExpression[];
    /**
     * A set of expressions that each produce a reaction when evaluated.
     *
     * A reaction specifies an action that may be queued up for some time in the future,
     * should an instance of the one at hand be performed.
     */
    readonly reactions: WrappedExpression[];
    /**
     * Specifications for yielding numeric salience values for the action.
     *
     * The salience of an action is meant to serve as metadata on a character's knowledge of
     * the action -- it captures how noteworthy the action is to that character, and it can
     * e.g. fade over time to represent forgetting.
     */
    readonly saliences: Saliences;
    /**
     * Specifications for yielding subjective associations for the action.
     *
     * Like saliences, associations are meant to serve as metadata on a character's knowledge
     * of the action. In this case, it is a set of tags representing the character's subjective
     * view of the action.
     */
    readonly associations: Associations;
    /**
     * Embargo directives, which are authorial levers for controlling the frequency
     * with which an action will be performed in the host application.
     */
    readonly embargoes: EmbargoDeclaration[];
}

/**
 * A unique name for an action.
 *
 * @category Other
 */
export type ActionName = string;

/**
 * Conditions that must hold in order to target a given construct.
 */
export interface ConstructConditions {
    /**
     * Global construct conditions, meaning ones that do not reference any roles
     * and can thus be tested immediately upon targeting a construct.
     */
    readonly globalConditions: WrappedExpression[];
    /**
     * Standard conditions, keyed by the role during whose casting they will be tested.
     */
    readonly roleConditions: Record<RoleName, WrappedExpression[]>;
}

/**
 * A definition for a role in a construct.
 */
export interface RoleDefinition {
    /**
     * A name for this role, unique only within the associated construct definition.
     */
    readonly name: RoleName;
    /**
     * The type of entity (or symbol) that must be cast in this role.
     */
    readonly entityType: RoleEntityType;
    /**
     * The minimum number of slots to cast for this role.
     */
    readonly min: number;
    /**
     * The maximum number of slots to cast for this role.
     */
    readonly max: number;
    /**
     * The name of this role's parent, if any, in the dependency tree that is used during role casting.
     *
     * This dependency tree is used to optimize this process.
     */
    readonly parent: RoleName | null;
    /**
     * The names of this role's children, if any, in the dependency tree that is used during casting.
     *
     * This dependency tree is used to optimize this process.
     */
    readonly children: string[];
    /**
     * If specified, a directive specifying the pool of entities who may be cast into this role
     * at a given point in time, given an initiator and possibly other prospective role bindings.
     *
     * If this is an action role, and if there is an active {@link EvaluationContext.__searchDomain__},
     * the pool will automatically be filtered to actions in the search domain. This occurs in {@link getCustomPool}.
     */
    readonly pool: CastingPool | null;
    /**
     * If specified, the chance that a qualifying entity will be cast into the role.
     *
     * This field was first implemented to support a pattern of specifying how likely it is that
     * a given nearby character will witness an action, which can be accomplished by defining a
     * `bystander` role with a high `max` and a specified `chance` value.
     *
     * The compiler restricts chance values to `[0.0, 1.0]`.
     */
    readonly chance: number | null;
    /**
     * If specified, a mean on which to anchor a distribution from which will be sampled
     * the number of entities to cast into the role.
     *
     * The compiler guarantees that `mean` and `sd` are either both present or both elided.
     */
    readonly mean: number | null;
    /**
     * If specified, a standard deviation for a distribution from which will be sampled
     * the number of entities to cast into the role.
     *
     * The compiler guarantees that `mean` and `sd` are either both present or both elided.
     */
    readonly sd: number | null;
    /**
     * If applicable, the mode of participation for a character cast in this role.
     *
     * This field is only non-null for action roles that cast characters who are physically
     * present for the action (i.e., ones for which `anywhere` is `false`).
     */
    readonly participationMode: RoleParticipationMode | null;
    /**
     * Whether an entity cast in this role does not need to be physically present for the action.
     *
     * Note that the entity *can* still be physically present, so authors should take care to write
     * conditions specifying whether an entity is present, as needed.
     *
     * Currently, this only applies to characters and items, though roles casting all other
     * entity types will have `true` here.
     */
    readonly anywhere: boolean;
    /**
     * Whether this role must be precast and never cast through typical role casting.
     *
     * For an action, a role can be "precast" via a reaction declaration that targets the action. For other
     * constructs, a role can be precast in the expression targeting the construct -- e.g., an action search
     * can precast a role for a query.
     *
     * If an action has a precast role, it must be marked `reserved`, because there is no way
     * to cast a precast role via general action targeting.
     */
    readonly precast: boolean;
    /**
     * Whether the entity cast in this role is to be constructed as a result of the associated action.
     *
     * Spawn roles only appear in actions, and the compiler ensures that `spawn` and `spawnFunction`
     * are either both truthy or both falsy.
     */
    readonly spawn: boolean;
    /**
     * For `spawn` roles only, a custom-function call that will cause the new entity
     * (to be cast in this role) to be constructed before returning its entity ID.
     *
     * Spawn roles only appear in actions, and the compiler ensures that `spawn` and `spawnFunction`
     * are either both truthy or both falsy.
     */
    readonly spawnFunction: CustomFunctionCall | null;
    /**
     * If this role is an alias for a role in a parent definition, this will
     * store the name of the original role.
     */
    readonly renames: RoleName | null;
}

/**
 * A name for a role (unique only within its definition).
 *
 * @category Other
 */
export type RoleName = string;

/**
 * A directive specifying the pool of entities who may be cast into a role at a given point in time,
 * given an initiator and possibly other prospective role bindings.
 */
export interface CastingPool {
    /**
     * The Viv expression that should evaluate to a casting pool.
     */
    readonly body: Expression;
    /**
     * Whether the casting pool is cachable.
     *
     * A casting pool is cachable so long as the associated pool declaration *does not* reference
     * a non-initiator role, in which case the role pool would have to be re-computed if the parent
     * role(s) are re-cast (which never happens with an initiator role). When a casting pool is cached,
     * it is not recomputed even as other non-initiator roles are re-cast.
     */
    readonly uncachable: boolean;
}

/**
 * Specifications for determining a numeric salience score for the action that will be held
 * by a given character who experiences, observes, or otherwise learns about the action.
 */
export interface Saliences {
    /**
     * A specification for a default value to be used as a fallback for any character for which
     * there is no applicable `roles` entry and for which no `custom` expression yielded a value.
     *
     * This will always be structured as a Viv enum, int, or float, where even the enum should
     * resolve to a numeric value.
     */
    readonly default: SalienceScoreExpression;
    /**
     * A mapping from role names to expressions yielding salience values.
     *
     * For a character who is bound in the given role, the corresponding expression
     * will determine the salience value.
     */
    readonly roles: Record<RoleName, SalienceScoreExpression>;
    /**
     * For characters for whom no `roles` entry applies, a series of zero or more custom salience-yielding
     * expressions will be evaluated, with the character bound to the local variable specified in the
     * `variable` property.
     *
     * These will be evaluated in turn, with the first numeric evaluated value being assigned as
     * the character's salience. If no custom expression evaluates to a numeric value, the default
     * value will be used.
     *
     * This field is only used if there is no applicable per-role field for the character at hand.
     */
    readonly custom: Expression[];
    /**
     * If there is a non-empty `custom` field, the local variable to which a character
     * will be bound when computing a salience for them.
     *
     * This allows for evaluation of the body expressions, which may refer to this variable
     * in order to do things like conditionalize salience based on the character at hand.
     */
    readonly variable: LocalVariable | null;
}

/**
 * An expression that evaluates to a numeric salience score.
 */
export type SalienceScoreExpression = Enum | IntField | FloatField;

/**
 * Specifications for determining the subjective associations for the action that will be held
 * by a given character who experiences, observes, or otherwise learns about the action.
 */
export interface Associations {
    /**
     * A specification for a default value to be used as a fallback for any character for which there is no
     * applicable `roles` entry and for which no `custom` expression yielded a value.
     *
     * This will always be structured as a Viv list whose elements will be simple Viv string expressions.
     */
    readonly default: ListField;
    /**
     * A mapping from role names to Viv lists whose elements will be simple Viv string expressions.
     *
     * For a character who is bound in the given role, the corresponding expression will
     * determine their associations.
     */
    readonly roles: Record<RoleName, ListField>;
    /**
     * For characters for whom no `roles` entry applies, a series of zero or more custom
     * associations-yielding expressions will be evaluated, with the character bound to
     * the local variable specified in the `variable` property.
     *
     * These will be evaluated in turn, with the first evaluated string array being assigned as the character's
     * salience. If no custom expression evaluates to a numeric value, the default value will be used.
     *
     * This field is only used if there is no applicable per-role field for the character at hand.
     */
    readonly custom: Expression[];
    /**
     * If there is a non-empty `custom` field, the local variable to which a character will
     * be bound when computing associations for them.
     *
     * This allows for evaluation of the body expressions, which may refer to this variable
     * in order to do things like conditionalize associations based on the character at hand.
     */
    readonly variable: LocalVariable | null;
}

/**
 * An embargo declaration constraining the subsequent performance of an associated action.
 */
export interface EmbargoDeclaration {
    /**
     * If applicable, names for all the roles constituting the bindings over which this embargo holds.
     *
     * For instance, if two roles R1 and R2 were specified here, and if an action A was performed with
     * bindings R1=[E1] and R2=[E2, E3], then this embargo would hold over all cases of A with any
     * prospective bindings that cast E1 in R1 and *either* E2 and/or E3 in R2. Stated differently, the
     * embargo holds if for all roles specified here, some subset overlaps between the embargo role
     * bindings and the prospective role bindings. Often, an embargo will only specify an initiator.
     */
    readonly roles: RoleName[] | null;
    /**
     * Whether the embargo is permanent.
     *
     * If so, `period` will always be `null`, and exactly one of the fields is guaranteed to be truthy.
     */
    readonly permanent: boolean;
    /**
     * For an embargo that is not permanent, a specification of the time period over which
     * the embargo will hold.
     *
     * If `period` is present, `permanent` will always be false, and exactly one of the fields
     * is guaranteed to be truthy.
     */
    readonly period: TimeDelta | null;
    /**
     * Whether the embargo holds only over a certain location, that being the location
     * at which an instance of the associated action has just been performed.
     */
    readonly here: boolean;
}

/**
 * The definition for a plan, which an author defines to orchestrate complex action sequences
 * that may play out over extended periods of story time.
 *
 * A plan is composed primarily by an ordered set of {@link PlanPhase}, each of which centers on
 * a *tape* of {@link PlanInstruction}. The plan executor executes a phase by stepping
 * a program counter ({@link PlanInstructionAddress}) through the phase tape, which specifies control flow
 * along with instructions for queueing the material that makes up the plan.
 */
export interface PlanDefinition {
    /**
     * Discriminator for the plan construct type.
     */
    readonly type: ConstructDiscriminator.Plan;
    /**
     * The (unique) name of the plan.
     */
    readonly name: PlanName;
    /**
     * Mapping from the names of the roles associated with this plan to their respective role definitions.
     *
     * Note that the roles appear in the order in which the author defined them.
     */
    readonly roles: Record<RoleName, RoleDefinition>;
    /**
     * The names of the roles constituting the roots of the trees composing role-dependency
     * forest for this plan definition.
     *
     * The roots are given in the order by which role casting will proceed.
     */
    readonly roleForestRoots: RoleName[];
    /**
     * Conditions for the plan, grouped by role name (with the special global-conditions key).
     *
     * A condition is an expression that must hold (i.e., evaluate to a truthy value) in order
     * for the plan to be launched.
     */
    readonly conditions: ConstructConditions;
    /**
     * A mapping from phase name to phase definition, for all phases structuring the plan.
     *
     * Note that the individual phases each point to the next phase, so we don't need to
     * maintain order here.
     */
    readonly phases: Record<PlanPhaseName, PlanPhase>;
    /**
     * The name of the initial phase in the plan.
     *
     * Plan execution will always begin in this phase.
     */
    readonly initialPhase: PlanPhaseName;
}

/**
 * A (unique) name for a plan.
 *
 * @category Other
 */
export type PlanName = string;

/**
 * A phase in a plan, which is structured as a tape of instructions for which execution can
 * be arbitrary paused according to the author-defined control flow.
 *
 * For instance, an author can specify that the plan will not resume until some period of story time
 * has elapsed, or until one of the reactions in a group has been performed, and so forth.
 */
export interface PlanPhase {
    /**
     * The name for the phase, guaranteed to be unique (only) within the enclosing plan.
     */
    readonly name: PlanPhaseName;
    /**
     * The name of the next phase in the plan, if any, else `null` if it's the last phase in the plan.
     *
     * Completion of a final phase causes the plan to resolve with a final success status.
     */
    readonly next: PlanPhaseName | null;
    /**
     * An array containing the compiled instruction tape for this phase, such that each array index serves
     * as an {@link PlanInstructionAddress}.
     *
     * If execution reaches the end of the tape, execution proceeds to the next phase in the plan,
     * if there is one; otherwise, the plan succeeds.
     */
    readonly tape: PlanInstruction[];
}

/**
 * A name for a plan phase, guaranteed to be unique only within the enclosing plan.
 */
export type PlanPhaseName = string;

/**
 * The base shape shared between action selectors and plan selectors.
 */
export interface SelectorDefinitionBase {
    /**
     * Discriminator for selector's construct type.
     */
    readonly type:
        | ConstructDiscriminator.ActionSelector
        | ConstructDiscriminator.PlanSelector;
    /**
     * The (unique) name of the selector.
     */
    readonly name: SelectorName;
    /**
     * Mapping from the names of the roles associated with this selector to their respective role definitions.
     *
     * Note that the roles appear in the order in which the author defined them.
     */
    readonly roles: Record<RoleName, RoleDefinition>;
    /**
     * The names of the roles constituting the roots of the trees composing role-dependency
     * forest for this selector definition.
     *
     * The roots are given in the order by which role casting will proceed.
     */
    readonly roleForestRoots: RoleName[];
    /**
     * Conditions for the selector, grouped by role name (with the special global-conditions key).
     *
     * A condition is an expression that must hold (i.e., evaluate to a truthy value) in order
     * for the selector to be targeted.
     */
    readonly conditions: ConstructConditions;
    /**
     * The sort policy that will be used to determine the order in which candidates will be targeted.
     */
    readonly policy: SelectorPolicy;
    /**
     * The candidates (actions and/or other action selectors) that may be targeted via this selector.
     */
    readonly candidates: SelectorCandidate[];
}

/**
 * A unique name for a selector.
 *
 * @category Other
 */
export type SelectorName = string;

/**
 * The definition for an action selector, which groups candidate actions (and potentially other action
 * selectors) under a targeting policy and succeeds upon successful targeting of one of the candidates.
 */
export interface ActionSelectorDefinition extends SelectorDefinitionBase {
    /**
     * Discriminator for the action-selector construct type.
     */
    readonly type: ConstructDiscriminator.ActionSelector;
    /**
     * Whether this selector is reserved, in which case it may only be targeted
     * via selector targeting or queueing.
     */
    readonly reserved: boolean;
    /**
     * The name of the initiator role, isolated here for optimization purposes.
     */
    readonly initiator: RoleName;
}

/**
 * The definition for a plan selector, which groups plans actions (and potentially other plan selectors)
 * under a targeting policy and succeeds upon successful targeting of one of the candidates.
 */
export interface PlanSelectorDefinition extends SelectorDefinitionBase {
    /**
     * Discriminator for the plan-selector construct type.
     */
    readonly type: ConstructDiscriminator.PlanSelector;
}

/**
 * A query used to search for actions in a character's memories or in the chronicle.
 */
export interface QueryDefinition {
    /**
     * Discriminator for the query construct type.
     */
    readonly type: ConstructDiscriminator.Query;
    /**
     * The (unique) name of the query.
     */
    readonly name: QueryName;
    /**
     * Mapping from the names of the roles associated with this action to their respective role definitions.
     *
     * Note that a query may have zero roles, in which case this is empty. Also,
     * the roles appear in the order in which the author defined them.
     */
    readonly roles: Record<RoleName, RoleDefinition>;
    /**
     * The names of the roles constituting the roots of the trees composing role-dependency
     * forest for this query definition.
     *
     * The roots are given in the order by which role casting will proceed.
     */
    readonly roleForestRoots: RoleName[];
    /**
     * Conditions for the query, grouped by role name (with the special global-conditions key).
     *
     * A condition is an expression that must hold (i.e., evaluate to a truthy value) in order
     * for a query to match.
     */
    readonly conditions: ConstructConditions;
    /**
     * If specified, a component specifying permissible action names for matches to the query.
     */
    readonly actionName: SetPredicate[] | null;
    /**
     * If specified, a component specifying permissible causal ancestors for matches to the query.
     */
    readonly ancestors: SetPredicate[] | null;
    /**
     * If specified, a component specifying permissible causal descendants for matches to the query.
     */
    readonly descendants: SetPredicate[] | null;
    /**
     * If specified, a component specifying a permissible importance range for matches to the query.
     */
    readonly importance: QueryNumericRange | null;
    /**
     * If specified, a component specifying permissible tags for matches to the query.
     */
    readonly tags: SetPredicate[] | null;
    /**
     * If specified, a component specifying a permissible salience range for matches to the query.
     *
     * If this query is targeted with the chronicle as a search domain, an error will be thrown,
     * since the query applies to character memories.
     */
    readonly salience: QueryNumericRange | null;
    /**
     * If specified, a component specifying permissible associations for matches to the query.
     *
     * If this query is targeted with the chronicle as a search domain, an error will be thrown,
     * since the query applies to character memories.
     */
    readonly associations: SetPredicate[] | null;
    /**
     * If specified, a component specifying permissible locations for matches to the query.
     */
    readonly location: SetPredicate[] | null;
    /**
     * If specified, a component specifying permissible performance times for matches to the query.
     */
    readonly time: TemporalConstraint[] | null;
    /**
     * If specified, a component specifying permissible initiator-role bindings for matches to the query.
     */
    readonly initiator: SetPredicate[] | null;
    /**
     * If specified, a component specifying permissible partner-role bindings for matches to the query.
     */
    readonly partners: SetPredicate[] | null;
    /**
     * If specified, a component specifying permissible recipient-role bindings for matches to the query.
     */
    readonly recipients: SetPredicate[] | null;
    /**
     * If specified, a component specifying permissible bystander-role bindings for matches to the query.
     */
    readonly bystanders: SetPredicate[] | null;
    /**
     * If specified, a component specifying permissible active-role bindings for matches to the query.
     */
    readonly active: SetPredicate[] | null;
    /**
     * If specified, a component specifying permissible present-role bindings for matches to the query.
     */
    readonly present: SetPredicate[] | null;
}

/**
 * A unique name for a query.
 *
 * @category Other
 */
export type QueryName = string;

/**
 * A permissible numeric range used in a query.
 */
export interface QueryNumericRange {
    /**
     * The lower bound of the range, if there is one, else `null`.
     */
    readonly lower: QueryNumericRangeBound | null;
    /**
     * The upper bound of the range, if there is one, else `null`.
     */
    readonly upper: QueryNumericRangeBound | null;
}

/**
 * A bound on a permissible numeric range used in a query.
 */
export interface QueryNumericRangeBound {
    /**
     * The number at this bound of a range.
     */
    readonly value: IntField | FloatField | Enum;
    /**
     * Whether this bound is inclusive.
     */
    readonly inclusive: boolean;
}

/**
 * The definition for a sifting pattern, which is used to retrieve a sequence of actions
 * that together may be construed as constituting the events in a story.
 */
export interface SiftingPatternDefinition {
    /**
     * Discriminator for the sifting-pattern construct type.
     */
    readonly type: ConstructDiscriminator.SiftingPattern;
    /**
     * The (unique) name of the sifting pattern.
     */
    readonly name: SiftingPatternName;
    /**
     * Mapping from the names of the roles associated with this sifting pattern to their
     * respective role definitions.
     *
     * This will include the role definitions defined in the 'actions' section of a sifting-pattern
     * definition, whose role names will also be stored in the `actions` property here.
     *
     * Note that the roles appear in the order in which the author defined them.
     */
    readonly roles: Record<RoleName, RoleDefinition>;
    /**
     * The names of the roles constituting the roots of the trees composing role-dependency
     * forest for this sifting-pattern definition.
     *
     * The roots are given in the order by which role casting will proceed.
     */
    readonly roleForestRoots: RoleName[];
    /**
     * Conditions for the sifting pattern, grouped by role name (with the special global-conditions key).
     *
     * A condition is an expression that must hold (i.e., evaluate to a truthy value) in order
     * for the sifting pattern to match.
     */
    readonly conditions: ConstructConditions;
    /**
     * An array containing the roles names for all the actions to expose in a match for this pattern.
     *
     * These will correspond to a subset of the roles defined in the `roles` property.
     */
    readonly actions: RoleName[];
}

/**
 * A unique name for a sifting pattern.
 *
 * @category Other
 */
export type SiftingPatternName = string;

/**
 * A definition for a Viv trope (reusable bundle of conditions).
 */
export interface TropeDefinition {
    /**
     * Discriminator for the trope construct type.
     */
    readonly type: ConstructDiscriminator.Trope;
    /**
     * The (unique) name of the trope.
     */
    readonly name: TropeName;
    /**
     * Mapping from the names of the roles associated with this trope to their respective role definitions.
     *
     * The roles appear in the order in which the author defined them.
     */
    readonly roles: Record<RoleName, RoleDefinition>;
    /**
     * The names of the roles constituting the roots of the trees composing role-dependency
     * forest for this trope definition.
     *
     * The roots are given in the order by which role casting will proceed.
     */
    readonly roleForestRoots: RoleName[];
    /**
     * Conditions for the trope, grouped by role name (with the special global-conditions key).
     *
     * A condition is an expression that must hold (i.e., evaluate to a truthy value) in order
     * for the trope to fit a given cast.
     */
    readonly conditions: ConstructConditions;
}

/**
 * A unique name for a trope.
 *
 * @category Other
 */
export type TropeName = string;

/**
 * A Viv expression wrapped with an array containing the names of all roles that it references.
 *
 * These reference lists are used for various optimizations.
 */
export interface WrappedExpression {
    /**
     * The actual expression that is being wrapped.
     */
    readonly body: Expression;
    /**
     * Names of the roles referenced in the AST chunk constituting the expression.
     *
     * This field is used to support various optimizations.
     */
    readonly references: RoleName[];
}
