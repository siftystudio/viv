import type { CustomFunctionName } from "../adapter/types";
import type {
    ActionDefinition,
    ActionName,
    ActionSelectorDefinition,
    PlanDefinition,
    PlanName,
    PlanSelectorDefinition,
    QueryName,
    RoleName,
    SelectorName,
    SiftingPatternName,
    TropeName
} from "../content-bundle/types";
import type { ConstructDiscriminator } from "../content-bundle";
import type {
    ActionRelationOperator,
    ArithmeticOperator,
    AssignmentOperator,
    Comparator,
    ExpressionDiscriminator,
    ReferencePathComponentDiscriminator,
    SearchDomainPreparationPolicy,
    SetPredicateOperator,
    TemporalStatementDiscriminator,
    TimeFrameTimeUnit
} from "./constants";

/**
 * A Viv expression.
 */
export type Expression =
    | ActionRelation
    | ActionSearch
    | CustomFunctionCall
    | ArithmeticExpression
    | Assignment
    | BoolField
    | ChanceExpression
    | Comparison
    | Conditional
    | Conjunction
    | Disjunction
    | EntityReference
    | Enum
    | FloatField
    | Inspection
    | Inscription
    | IntField
    | ListField
    | Loop
    | MembershipTest
    | MemoryCheck
    | NullField
    | ObjectField
    | Reaction
    | Sifting
    | StringField
    | SymbolReference
    | TemplateStringField
    | TropeFit;

/**
 * Mixin for all expression types that specifies metadata about the expression source code.
 */
export interface SourceAnnotatedExpression {
    /**
     * Annotations on the expression specifying its original source code and position in a source file.
     *
     * This will be `null` in certain expressions, such as default values for optional fields,
     * that do not originate in source code.
     */
    readonly source: SourceAnnotations | null;
}

/**
 * An object containing annotations on the expression, specifying its original
 * source code and position in a source file.
 */
export interface SourceAnnotations {
    /**
     * Path to the source file including the expression, relative to the entry file's parent directory.
     */
    readonly filePath: string;
    /**
     * Line number (1-based) at the start of the expression.
     */
    readonly line: number;
    /**
     * Column number (1-based) at the start of the expression.
     */
    readonly column: number;
    /**
     * Line number (1-based) at the end of the expression.
     */
    readonly endLine: number;
    /**
     * Column number (1-based) at the end of the expression.
     */
    readonly endColumn: number;
    /**
     * The source code for the expression.
     */
    readonly code: string;
}

/**
 * Mixin for expression types that may be negated.
 */
export interface NegatableExpression {
    /**
     * Whether to negate the result of the expression.
     */
    readonly negated: boolean;
}

/**
 * Mixin for expression components that may fail safely.
 */
export interface FailSafeComponent {
    /**
     * Whether the expression component should fail safely by converting a nullish evaluation
     * into the falsy 'eval fail-safe signal'.
     *
     * This allows for references whose (intermediate) references may be undefined, as in `@foo.bar?.baz`.
     */
    readonly failSafe: boolean;
}

/**
 * A Viv action relation, which evaluates to `true` if a specified
 * relation holds between two actions.
 */
export interface ActionRelation extends SourceAnnotatedExpression, NegatableExpression {
    /**
     * Discriminator for a Viv action relation.
     */
    type: ExpressionDiscriminator.ActionRelation;
    /**
     * The actual expression value.
     */
    value: ActionRelationValue;
}

/**
 * The actual expression value for a Viv action relation.
 */
export interface ActionRelationValue {
    /**
     * An expression whose evaluation will be used as the left operand in relation test.
     */
    readonly left: Expression;
    /**
     * The relation operator.
     */
    readonly operator: ActionRelationOperator;
    /**
     * An expression whose evaluation will be used as the right operand in relation test.
     */
    readonly right: Expression;
}

/**
 * A Viv custom-function call, which parameterizes a call to a custom function that
 * is registered in the host application's Viv adapter.
 *
 * For instance, a Viv author might specify a function call in an action such as
 * `~transport(@person.id, @destination.id)`, in which case there must be a function
 * `transport()` exposed in the adapter.
 *
 * The Viv runtime confirms the existence of all referenced function names during adapter initialization.
 */
export interface CustomFunctionCall extends SourceAnnotatedExpression, NegatableExpression {
    /**
     * Discriminator for a Viv custom-function call.
     */
    readonly type: ExpressionDiscriminator.CustomFunctionCall;
    /**
     * The actual expression value.
     */
    readonly value: CustomFunctionCallValue;
}

/**
 * The actual expression value for a Viv custom-function call.
 */
export interface CustomFunctionCallValue extends FailSafeComponent {
    /**
     * The name of the custom function.
     *
     * There must be a function stored in the host application's Viv adapter, via a key by this same name.
     */
    readonly name: CustomFunctionName;
    /**
     * An ordered array of Viv expressions whose evaluations will be passed as arguments
     * to the function, in that same order.
     */
    readonly args: Expression[];
}

/**
 * A Viv arithmetic expression, which accepts two numeric operands and evaluates to a number.
 */
export interface ArithmeticExpression extends SourceAnnotatedExpression {
    /**
     * Discriminator for a Viv arithmetic expression.
     */
    readonly type: ExpressionDiscriminator.ArithmeticExpression;
    /**
     * The actual expression value.
     */
    readonly value: ArithmeticExpressionValue;
}

/**
 * The actual expression value for a Viv arithmetic expression.
 */
export interface ArithmeticExpressionValue {
    /**
     * An expression whose evaluation will be used as the left operand in the arithmetic expression.
     */
    readonly left: Expression;
    /**
     * The arithmetic operator.
     */
    readonly operator: ArithmeticOperator;
    /**
     * An expression whose evaluation will be used as the right operand in the arithmetic expression.
     */
    readonly right: Expression;
}

/**
 * A Viv assignment (or update).
 */
export interface Assignment extends SourceAnnotatedExpression {
    /**
     * Discriminator for a Viv assignment.
     */
    readonly type: ExpressionDiscriminator.Assignment;
    /**
     * The actual expression value.
     */
    readonly value: AssignmentValue;
}

/**
 * The actual expression value for a Viv assignment.
 */
export interface AssignmentValue {
    /**
     * A reference specifying the target of the assignment/update.
     */
    readonly left: EntityReference | SymbolReference;
    /**
     * The assignment/update operator.
     */
    readonly operator: AssignmentOperator;
    /**
     * An expression whose evaluation will be used as the right operand in the assignment/update.
     *
     * Note that for assignments that update persistent entity data, the value will always be proactively
     * dehydrated, such that all entity data included in the value will be converted into the associated
     * entity ID. We do this to prevent several potential issues, and the data can be rehydrated later on.
     */
    readonly right: Expression;
}

/**
 * A Viv boolean.
 */
export interface BoolField extends SourceAnnotatedExpression {
    /**
     * Discriminator for a Viv boolean.
     */
    readonly type: ExpressionDiscriminator.Bool;
    /**
     * The boolean literal to which this expression will evaluate.
     */
    readonly value: boolean;
}

/**
 * A Viv chance expression, which is a kind of condition that evaluates to true if the specified probability
 * value (a number between 0.0 and 1.0) exceeds a pseudorandom number generated by the interpreter.
 */
export interface ChanceExpression extends SourceAnnotatedExpression {
    /**
     * Discriminator for a Viv chance expression.
     */
    readonly type: ExpressionDiscriminator.ChanceExpression;
    /**
     * The specified probability, which the compiler guarantees to be a number in the range `[0, 1]`.
     */
    readonly value: number;
}

/**
 * A Viv comparison, whereby two values are compared using a comparator.
 */
export interface Comparison extends SourceAnnotatedExpression, NegatableExpression {
    /**
     * Discriminator for a Viv comparison.
     */
    readonly type: ExpressionDiscriminator.Comparison;
    /**
     * The actual expression value.
     */
    readonly value: ComparisonValue;
}

/**
 * The actual expression value for a Viv comparison.
 */
export interface ComparisonValue {
    /**
     * An expression whose evaluation will serve as the left operand in the comparison.
     */
    readonly left: Expression;
    /**
     * The comparison operator.
     */
    readonly operator: Comparator;
    /**
     * An expression whose evaluation will serve as the right operand in the comparison.
     */
    readonly right: Expression;
}

/**
 * A Viv conditional expression, allowing for branching based on the value of a test.
 */
export interface Conditional extends SourceAnnotatedExpression {
    /**
     * Discriminator for a Viv conditional.
     */
    readonly type: ExpressionDiscriminator.Conditional;
    /**
     * The actual expression value.
     */
    readonly value: ConditionalValue;
}

/**
 * The actual expression value for a Viv conditional.
 */
export interface ConditionalValue {
    /**
     * Branches representing the `if` and `elif` clauses in this conditional expression.
     */
    readonly branches: ConditionalBranch[];
    /**
     * If an author has provided an alternative body (via an `else` clause), an array
     * of expressions that will be evaluated/executed should the condition *not* hold.
     */
    readonly alternative: Expression[] | null;
}

/**
 * A Viv conditional branch, representing an `if` or `elif` clause.
 */
export interface ConditionalBranch {
    /**
     * The condition that will be tested, which holds if its evaluation is truthy.
     */
    readonly condition: Expression;
    /**
     * An array of expressions that will be evaluated/executed should the condition hold.
     */
    readonly consequent: Expression[];
}

/**
 * A Viv conjunction, which takes multiple expressions and evaluates to `true` if and
 * only if all the respective expressions evaluate to JavaScript-truthy values.
 */
export interface Conjunction extends SourceAnnotatedExpression, NegatableExpression {
    /**
     * Discriminator for a Viv conjunction.
     */
    readonly type: ExpressionDiscriminator.Conjunction;
    /**
     * The actual expression value.
     */
    readonly value: ConjunctionValue;
}

/**
 * The actual expression value for a Viv conjunction.
 */
export interface ConjunctionValue {
    /**
     * An array of expressions that will be evaluated in turn to determine the result of the conjunction.
     *
     * Note that the interpreter stops evaluating as soon as a falsy (in JavaScript) evaluation is encountered.
     */
    readonly operands: Expression[];
}

/**
 * A Viv disjunction, which takes multiple expressions and evaluates to `true` if and only
 * if at least one of the respective expressions evaluate to a JavaScript-truthy value.
 */
export interface Disjunction extends SourceAnnotatedExpression, NegatableExpression {
    /**
     * Discriminator for a Viv disjunction.
     */
    readonly type: ExpressionDiscriminator.Disjunction;
    /**
     * The actual expression value.
     */
    readonly value: DisjunctionValue;
}

/**
 * The actual expression value for a Viv disjunction.
 */
export interface DisjunctionValue {
    /**
     * An array of expressions that will be evaluated in turn to determine the result of the disjunction.
     *
     * Note that the interpreter stops evaluating as soon as a truthy (in JavaScript) evaluation is encountered.
     */
    readonly operands: Expression[];
}

/**
 * A Viv entity reference, structured as an anchor role and a (possibly empty) path to a specific property value.
 *
 * Usually, the property is on the entity cast into the anchor role, but this is not the case if the reference
 * contains a pointer. For instance, `@person.boss->boss->traits.cruel` would return the value stored at the path
 * `traits.cruel` on the boss of the boss of the entity cast in the anchor role `@person`. Note that the compiler
 * currently prevents an author from anchoring an entity reference in a symbol role, which allows the interpreter
 * to assume that the anchor role binds an entity. Also note that references anchored in scratch variables, e.g.
 * `$@foo.bar.baz`, are compiled to entity references -- this is because `$` is really just syntactic sugar for
 * `@this.scratch.`, with the next sigil indicating the type of the scratch variable.
 */
export interface EntityReference extends SourceAnnotatedExpression, NegatableExpression {
    /**
     * Discriminator for a Viv entity reference.
     */
    readonly type: ExpressionDiscriminator.EntityReference;
    /**
     * The actual expression value.
     */
    readonly value: ReferenceValue;
}

/**
 * A Viv symbol reference, structured as an anchor name and a (possibly empty)
 * path to a specific property value.
 */
export interface SymbolReference extends SourceAnnotatedExpression, NegatableExpression {
    /**
     * Discriminator for a Viv symbol reference.
     */
    readonly type: ExpressionDiscriminator.SymbolReference;
    /**
     * The actual expression value.
     */
    readonly value: ReferenceValue;
}

/**
 * The actual expression value for a Viv entity reference or symbol reference.
 */
export interface ReferenceValue extends FailSafeComponent {
    /**
     * The name anchoring this reference.
     */
    readonly anchor: RoleName | VariableName;
    /**
     * If applicable, the path to a specified property value.
     *
     * If the reference is just to the entity or symbol itself, this will be an empty list. Otherwise,
     * it will specify a path to a specific property value, either on that entity or symbol or another
     * entity (via a pointer).
     */
    readonly path: ReferencePathComponent[];
    /**
     * Whether the anchor is a local variable.
     *
     * This is a common pattern when an author loops over a group role.
     */
    readonly local: boolean;
    /**
     * Whether the anchor is marked as a group role, in which case it will evaluate
     * to an array containing the bindings for the role.
     */
    readonly group: boolean;
}

/**
 * A component in a Viv reference path.
 */
export type ReferencePathComponent =
    | ReferencePathComponentPropertyName
    | ReferencePathComponentPointer
    | ReferencePathComponentLookup;

/**
 * A component of a Viv reference path specifying a property to access.
 */
export interface ReferencePathComponentPropertyName extends FailSafeComponent {
    /**
     * Discriminator for a property-name reference path component.
     */
    readonly type: ReferencePathComponentDiscriminator.ReferencePathComponentPropertyName,
    /**
     * The name of the property to access.
     */
    readonly name: string;
}

/**
 * A component of a Viv reference path specifying a pointer to dereference.
 */
export interface ReferencePathComponentPointer extends FailSafeComponent {
    /**
     * Discriminator for a pointer reference path component.
     */
    readonly type: ReferencePathComponentDiscriminator.ReferencePathComponentPointer,
    /**
     * The name of the property to access in the entity data of the entity targeted by the pointer.
     */
    readonly propertyName: string;
}

/**
 * A component of a Viv reference path specifying a property lookup or an array access,
 * where the key/index can be specified by an arbitrary Viv expression.
 */
export interface ReferencePathComponentLookup extends FailSafeComponent {
    /**
     * Discriminator for a lookup reference path component.
     */
    readonly type: ReferencePathComponentDiscriminator.ReferencePathComponentLookup,
    /**
     * An expression that should evaluate to a valid JavaScript property key.
     *
     * This mainly comprises strings and integers. Note that in JavaScript, array indices
     * are actually just property keys.
     */
    readonly key: Expression;
}

/**
 * A Viv enum. Enums are resolved at runtime using the host application's Viv adapter.
 */
export interface Enum extends SourceAnnotatedExpression {
    /**
     * Discriminator for a Viv enum.
     */
    readonly type: ExpressionDiscriminator.Enum;
    /**
     * The actual expression value.
     */
    readonly value: EnumValue;
}

/**
 * The actual expression value for a Viv enum.
 */
export interface EnumValue {
    /**
     * The name of the enum.
     *
     * This must be resolvable by the host application at runtime.
     */
    readonly name: EnumName;
    /**
     * Whether to flip the sign of a numeric value associated with the enum.
     */
    readonly minus: boolean;
}

/**
 * A unique label for an enum value.
 *
 * @category Other
 */
export type EnumName = string;

/**
 * A Viv floating-point number.
 */
export interface FloatField extends SourceAnnotatedExpression {
    /**
     * Discriminator for a Viv floating-point number.
     */
    readonly type: ExpressionDiscriminator.Float;
    /**
     * The float literal to which this expression will evaluate.
     */
    readonly value: number;
}

/**
 * A Viv inscription.
 *
 * This kind of expression causes an item to be inscribed with knowledge about a given
 * action. If a character later inspects the item, they will learn about the action.
 */
export interface Inscription extends SourceAnnotatedExpression {
    /**
     * Discriminator for a Viv inscription.
     */
    readonly type: ExpressionDiscriminator.Inscription;
    /**
     * The actual expression value.
     */
    readonly value: InscriptionValue;
}

/**
 * The actual expression value for a Viv inscription.
 */
export interface InscriptionValue {
    /**
     * An expression whose evaluation will be used as the item operand in the inscription.
     */
    readonly item: Expression;
    /**
     * An expression whose evaluation will be used as the action operand in the inscription.
     */
    readonly action: Expression;
}

/**
 * A Viv inspection, which causes a character to *inspect* an item, which in turn
 * may lead them to learn about actions inscribed in the item.
 */
export interface Inspection extends SourceAnnotatedExpression {
    /**
     * Discriminator for a Viv inspection.
     */
    readonly type: ExpressionDiscriminator.Inspection;
    /**
     * The actual expression value.
     */
    readonly value: InspectionValue;
}

/**
 * The actual expression value for a Viv inspection.
 */
export interface InspectionValue {
    /**
     * An expression whose evaluation will be used as the character operand in the inspection.
     */
    readonly character: Expression;
    /**
     * An expression whose evaluation will be used as the item operand in the inspection.
     */
    readonly item: Expression;
}

/**
 * A Viv integer.
 */
export interface IntField extends SourceAnnotatedExpression {
    /**
     * Discriminator for a Viv integer.
     */
    readonly type: ExpressionDiscriminator.Int;
    /**
     * The integer literal to which this expression will evaluate.
     */
    readonly value: number;
}

/**
 * A Viv list, defined as an ordered array of Viv expressions.
 *
 * Once evaluated, the result will contain the respective evaluations
 * of the expressions, in that same order.
 */
export interface ListField extends SourceAnnotatedExpression {
    /**
     * Discriminator for a Viv list.
     */
    readonly type: ExpressionDiscriminator.List;
    /**
     * The actual expression value.
     */
    readonly value: Expression[];
}

/**
 * A Viv loop, allowing for iteration over some iterable value.
 */
export interface Loop extends SourceAnnotatedExpression {
    /**
     * Discriminator for a Viv loop.
     */
    readonly type: ExpressionDiscriminator.Loop;
    /**
     * The actual expression value.
     */
    readonly value: LoopValue;
}

/**
 * The actual expression value for a Viv loop.
 */
export interface LoopValue {
    /**
     * An expression that should evaluate to a value that is iterable in JavaScript.
     */
    readonly iterable: Expression;
    /**
     * The local variable to which each member of the iterable is assigned on its
     * respective iteration of the loop.
     */
    readonly variable: LocalVariable;
    /**
     * The body of the loop, structured as an array of expressions that will each be interpreted,
     * in order, on each iteration.
     *
     * These body expressions can reference the loop variable, allowing for Viv code that acts
     * on each member of an iterable.
     */
    readonly body: Expression[];
}

/**
 * A Viv local variable.
 */
export interface LocalVariable {
    /**
     * The name of the local variable.
     */
    readonly name: VariableName;
    /**
     * Whether the variable is marked as binding an entity (as opposed to a symbol).
     */
    readonly isEntityVariable: boolean;
}

/**
 * The name for a variable used in an assignment or a loop.
 */
export type VariableName = string;

/**
 * A Viv membership test, which takes two expressions and evaluates to true if the evaluation
 * of the first expression is a member of the evaluation of the second expression.
 */
export interface MembershipTest extends SourceAnnotatedExpression, NegatableExpression {
    /**
     * Discriminator for a Viv membership test.
     */
    readonly type: ExpressionDiscriminator.MembershipTest;
    /**
     * The actual expression value.
     */
    readonly value: MembershipTestValue;
}

/**
 * The actual expression value for a Viv membership test.
 */
export interface MembershipTestValue {
    /**
     * An expression whose evaluation will be used as the item operand in the membership test.
     */
    readonly item: Expression;
    /**
     * An expression whose evaluation will be used as the collection operand in the membership test.
     */
    readonly collection: Expression;
}

/**
 * A Viv memory check.
 *
 * This kind of expression takes two expressions as operands and evaluates to `True` if
 * the evaluation of the first expression is a character, the second expression is an
 * action, and the character has a memory of the action.
 */
export interface MemoryCheck extends SourceAnnotatedExpression, NegatableExpression {
    /**
     * Discriminator for a Viv memory check.
     */
    readonly type: ExpressionDiscriminator.MemoryCheck;
    /**
     * The actual expression value.
     */
    readonly value: MemoryCheckValue;
}

/**
 * The actual expression value for a Viv memory check.
 */
export interface MemoryCheckValue {
    /**
     * An expression whose evaluation will be used as the character operand in the memory check.
     */
    readonly character: Expression;
    /**
     * An expression whose evaluation will be used as the action operand in the memory check.
     */
    readonly action: Expression;
}

/**
 * A Viv null value.
 */
export interface NullField extends SourceAnnotatedExpression {
    /**
     * Discriminator for a Viv null value.
     */
    readonly type: ExpressionDiscriminator.NullType;
    /**
     * JavaScript's `null`, to which the expression always evaluates.
     */
    readonly value: null;
}

/**
 * A Viv object literal, which maps keys (string literals) to Viv expressions.
 *
 * Once evaluated, the result will map those same keys to the respective
 * evaluations of the Viv expressions.
 */
export interface ObjectField extends SourceAnnotatedExpression {
    /**
     * Discriminator for a Viv object literal.
     */
    readonly type: ExpressionDiscriminator.Object;
    /**
     * The actual expression value.
     */
    readonly value: Record<string, Expression>;
}

/**
 * A Viv action search.
 *
 * This kind of expression specifies the execution of a query to drive a search over either a character's
 * memories or the chronicle (all historical actions), to return a collection of actions matching the query.
 */
export interface ActionSearch extends SourceAnnotatedExpression {
    /**
     * Discriminator for a Viv action search.
     */
    readonly type: ExpressionDiscriminator.ActionSearch;
    /**
     * The actual expression value.
     */
    readonly value: ActionSearchValue;
}

/**
 * The actual expression value for a Viv action search.
 */
export interface ActionSearchValue {
    /**
     * The name of the query that will be used for the search, if any, else `null`.
     *
     * If none is provided, the search will simply retrieve all actions in the domain.
     */
    readonly queryName: QueryName | null;
    /**
     * Precast bindings for the target query, as asserted in the search declaration.
     */
    readonly bindings: PrecastBindings;
    /**
     * A declaration for how to construct a search domain for this action search.
     */
    readonly searchDomain: SearchDomainDeclaration;
}

/**
 * A declaration for how to prepare a search domain for a {@link ActionSearch} or a {@link Sifting}.
 */
export interface SearchDomainDeclaration {
    /**
     * The policy to use when preparing the search domain.
     */
    readonly policy: SearchDomainPreparationPolicy;
    /**
     * If the search is to run over a character's memories, this is an expression that should
     * evaluate to a reference to that character.
     *
     * If `null` is here, the query will be run over the chronicle (all historical actions),
     * though an error will be thrown if a query is specified and it uses memory criteria (the
     * `salience` and/or `associations` fields).
     *
     * A few notes:
     *  - The compiler will ensure that a value is only present here if `policy` is
     *    {@link SearchDomainPreparationPolicy.Expression}.
     *  - If there is already a search domain enclosing this one, the resulting domain will
     *    be narrowed to the intersection of the two domains (the existing one and the memories
     *    of the character specified by this expression).
     *  - If a character has {@link CharacterMemory.forgotten} an action, it will
     *    not be included in the constructed search domain.
     */
    readonly expression: Expression | null;
}

/**
 * A Viv reaction.
 *
 * A reaction specifies a construct (action, plan, or selector) that will be queued
 * upon evaluation of the reaction expression.
 */
export interface Reaction extends SourceAnnotatedExpression {
    /**
     * Discriminator for Viv reaction expressions.
     */
    readonly type: ExpressionDiscriminator.Reaction;
    /**
     * The actual expression value.
     */
    readonly value: ReactionValue;
}

/**
 * The actual expression value for a Viv reaction.
 */
export interface ReactionValue {
    /**
     * The name of the target construct, i.e., the one queued up by this reaction.
     */
    readonly targetName: ActionName | PlanName | SelectorName;
    /**
     * The type of construct that the reaction will queue.
     */
    readonly targetType: ReactionTargetConstructDiscriminator;
    /**
     * Precast bindings for the target construct, as asserted in the reaction declaration.
     */
    readonly bindings: PrecastBindings;
    /**
     * An expression that should evaluate to a boolean value indicating whether the reaction
     * will queue its target construct urgently.
     *
     * The evaluated value will be cast to a boolean, so authors should be careful when using
     * this parameter. Urgent actions and action selectors receive the highest priority in
     * action queues, while an urgent plan or plan selector will be targeted (and potentially
     * launched) upon being queued.
     *
     * If no expression is supplied, the reaction will not be marked urgent.
     */
    readonly urgent: Expression | null;
    /**
     * An expression that should evaluate to a numeric value specifying the priority
     * of the queued construct.
     *
     * Within a given queue group (urgent or non-urgent), queued actions (and queued
     * action selectors) are targeted in descending order of priority.
     *
     * Because the global plan queue is unordered, the compiler will flag the use of
     * this option in a reaction queueing a plan or plan selector.
     */
    readonly priority: Expression | null;
    /**
     * An expression that should evaluate to a location, that being the specific location at which an
     * eventual action must be performed.
     *
     * The compiler will flag the use of this option in a reaction queueing a plan or plan selector.
     */
    readonly location: SetPredicate[] | null;
    /**
     * A set of 0-3 temporal constraints constraining the time at which an eventual action may be performed.
     *
     * The compiler will flag the use of this option in a reaction queueing a plan or plan selector.
     */
    readonly time: TemporalConstraint[] | null;
    /**
     * A set of expressions such that, if all of them hold (i.e., evaluate to a truthy value),
     * the queued construct will be dequeued.
     *
     * This will always be either `null` or a non-empty array.
     */
    readonly abandonmentConditions: Expression[] | null;
    /**
     * An object specifying logic around repeating the reaction should it succeed.
     *
     * Note: Viv already has automatic retry logic for reactions that can't be targeted currently.
     */
    readonly repeatLogic: ReactionRepeatLogic | null;
}

/**
 * Union containing discriminators for the construct types that a reaction may queue.
 */
export type ReactionTargetConstructDiscriminator =
    | ConstructDiscriminator.Action
    | ConstructDiscriminator.ActionSelector
    | ConstructDiscriminator.Plan
    | ConstructDiscriminator.PlanSelector;

/**
 * Union containing the construct types that a reaction may target.
 */
export type ReactionTargetConstruct =
    | ActionDefinition
    | ActionSelectorDefinition
    | PlanDefinition
    | PlanSelectorDefinition;

/**
 * Precast bindings for the targeting of some construct, as in a reaction or a sifting expression.
 */
export interface PrecastBindings {
    /**
     * Whether the precast bindings are marked partial, meaning additional required role
     * slots will need to be cast.
     *
     * The compiler will verify that all required slots appear to be precast, but we will
     * also confirm this at runtime.
     */
    readonly partial: boolean;
    /**
     * A mapping from role name to an expression that will evaluate to precast bindings for that role.
     */
    readonly roles: Record<RoleName, Expression>;
}

/**
 * An object specifying logic around repeating the reaction after it *succeeds*.
 *
 * This logic is only considered when the construct queued by the reaction is successfully performed/executed.
 *
 * As a motivating example, consider the case of one character, Alice, trying to track down another character,
 * Bob, to arrest him. The arrest action is queued by a plan, with high priority, but it requires the two
 * characters to be in the same location. To make this happen, the plan queues a subplan that causes Alice
 * to search for Bob, going to his home, workplace, and favorite haunts. This subplan will succeed if Alice
 * travels to those places. But what if she doesn't find Bob in any of these spots? She should probably try
 * again tomorrow, going to the likely spots once again.
 *
 * Using repeat logic, an author can easily specify this by declaring that, if the search subplan succeeds
 * but Alice has not found Bob, it should be queued again. In this case, `conditions` would specify that
 * Alice and Bob are not co-located, and `maxRepeats` would capture how many times Alice should attempt
 * the search.
 *
 * Note: Viv already has automatic retry logic for reactions that can't be targeted currently.
 */
export interface ReactionRepeatLogic {
    /**
     * A set of expressions such that, if all of them hold (i.e., evaluate to a truthy value),
     * a copy of the reaction will be queued again for its initiator.
     */
    conditions: Expression[];
    /**
     * The maximum number of times this reaction may be repeated.
     */
    maxRepeats: number;
}

/**
 * A set predicate that allows for certain values to appear in a set against which the operand will be tested.
 */
export interface SetPredicate {
    /**
     * The operator associated with this predicate.
     */
    readonly operator: SetPredicateOperator;
    /**
     * The operand to use when testing this predicate.
     */
    readonly operand: Expression[];
}

/**
 * A Viv sifting expression, which tests a sifting pattern against either the chronicle,
 * meaning all historical actions, or a character's memories.
 */
export interface Sifting extends SourceAnnotatedExpression {
    /**
     * Discriminator for a Viv sifting.
     */
    readonly type: ExpressionDiscriminator.Sifting;
    /**
     * The actual expression value.
     */
    readonly value: SiftingValue;
}

/**
 * The actual expression value for a Viv sifting.
 */
export interface SiftingValue {
    /**
     * The name of the sifting pattern to run.
     */
    readonly patternName: SiftingPatternName;
    /**
     * Precast bindings for the target pattern, as asserted in the sifting expression.
     */
    readonly bindings: PrecastBindings;
    /**
     * A declaration for how to construct a search domain for this sifting.
     */
    readonly searchDomain: SearchDomainDeclaration;
}

/**
 * A Viv string literal.
 */
export interface StringField extends SourceAnnotatedExpression {
    /**
     * Discriminator for a Viv string literal.
     */
    readonly type: ExpressionDiscriminator.String;
    /**
     * The string literal to which this expression will evaluate.
     */
    readonly value: string;
}

/**
 * A Viv templated string, structured as an ordered array of string literals and string-producing
 * expressions, the evaluations of which are concatenated to form the rendered string.
 */
export interface TemplateStringField extends SourceAnnotatedExpression {
    /**
     * Discriminator for a Viv templated string.
     */
    readonly type: ExpressionDiscriminator.TemplateString;
    /**
     * The actual expression value.
     */
    readonly value: Array<string | Expression>;
}

/**
 * A temporal constraint specifying a range between either points in time or times of day.
 */
export type TemporalConstraint = TimeFrameStatement | TimeOfDayStatement;

/**
 * A temporal constraint specifying a range between two points in time.
 */
export interface TimeFrameStatement {
    /**
     * Discriminator for a time-frame temporal constraint.
     */
    readonly type: TemporalStatementDiscriminator.TimeFrame;
    /**
     * The point in time at which the range opens.
     *
     * This is specified as a time delta (e.g., `5 days`) that the host application can resolve at runtime
     * into a point in time (by anchoring it relative to a given simulation timestamp). If no relative delta
     * is specified here, the range is open on this end.
     */
    readonly open: TimeDelta | null;
    /**
     * The point in time at which the range closes.
     *
     * This is specified as a time delta (e.g., `5 days`) that the host application can resolve at runtime
     * into a point in time (by anchoring it relative to a given simulation timestamp). If no delta is
     * specified here, the range is open on this end.
     */
    readonly close: TimeDelta | null;
    /**
     * Whether to anchor the time-frame constraint in the timestamp of the action that directly triggered
     * a reaction -- meaning the action whose definition included the reaction declaration -- as opposed
     * to the current simulation timestamp.
     *
     * This distinction only matters for cases where a reaction is triggered because a character has learned
     * about an action after the fact. In such cases, we need to know whether a time-frame constraint like
     * "between 1 year and 3 years" holds relative to the timestamp of the original  action or relative
     * to the time at which the character learned about the original action.
     *
     * Note: The compiler ensures that this field can only be `true` for temporal constraints on reactions.
     */
    readonly useActionTimestamp: boolean;
}

/**
 * A time period (e.g., "2 weeks") that can be used as a delta to resolve a point
 * in time relative to some anchor time (e.g., the current simulation time).
 */
export interface TimeDelta {
    /**
     * The number of time units -- e.g., `2` in `2 weeks`.
     */
    readonly amount: number;
    /**
     * The unit of time -- e.g., `weeks` in `2 weeks`.
     */
    readonly unit: TimeFrameTimeUnit;
}

/**
 * A temporal constraint specifying a range between two times of day.
 */
export interface TimeOfDayStatement {
    /**
     * Discriminator for a time-of-day temporal constraint.
     */
    readonly type: TemporalStatementDiscriminator.TimeOfDay;
    /**
     * The time of day that opens the range.
     *
     * If no time of day is specified here, the range is open on this end.
     *
     * Note that the host application is tasked with determining whether a given time of day has passed.
     */
    readonly open: TimeOfDayDeclaration | null;
    /**
     * The time of day that closes the range.
     *
     * If no time of day is specified here, the range is open on this end.
     *
     * Note that the host application is tasked with determining whether a given time of day has passed.
     */
    readonly close: TimeOfDayDeclaration | null;
}

/**
 * A time of day specified by a Viv author.
 */
export interface TimeOfDayDeclaration {
    /**
     * The hour of day.
     *
     * The compiler ensures that all values fall in the range `[0, 23]`.
     */
    readonly hour: number;
    /**
     * The minute of the hour of day.
     *
     * The compiler ensures that all values fall in the range `[0, 59]`.
     */
    readonly minute: number;
}

/**
 * A Viv trope fit, which evaluates to true if the trope holds with the given arguments.
 */
export interface TropeFit extends SourceAnnotatedExpression, NegatableExpression {
    /**
     * Discriminator for a Viv trope fit.
     */
    readonly type: ExpressionDiscriminator.TropeFit;
    /**
     * The actual expression value.
     */
    readonly value: TropeFitValue;
}

/**
 * The actual expression value for a Viv trope fit.
 */
export interface TropeFitValue {
    /**
     * The name of the trope that will be used for the test.
     */
    readonly tropeName: TropeName;
    /**
     * Precast bindings for the target trope, as asserted in the trope-fit expression.
     */
    readonly bindings: PrecastBindings;
}
