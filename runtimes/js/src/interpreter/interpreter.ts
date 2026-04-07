import set from "lodash/set";

import type { UID } from "../adapter/types"
import type { QueryDefinition, RoleName } from "../content-bundle/types";
import type {
    ActionRelationValue,
    ActionSearchValue,
    CustomFunctionCallValue,
    ArithmeticExpressionValue,
    AssignmentValue,
    ComparisonValue,
    ConditionalValue,
    ConjunctionValue,
    DisjunctionValue,
    Enum,
    Expression,
    InscriptionValue,
    InspectionValue,
    ListField,
    LoopValue,
    MembershipTestValue,
    MemoryCheckValue,
    NegatableExpression,
    ObjectField,
    ReactionTargetConstruct,
    ReactionValue,
    ReferencePathComponentLookup,
    ReferenceValue,
    SiftingValue,
    TemplateStringField,
    TropeFitValue,
    VariableName
} from "../dsl/types";
import type { RoleBindings } from "../role-caster/types";
import type { SiftingMatch } from "../story-sifter/types";
import type { EvaluationContext, ExpressionValue, GroupMember } from "./types";
import { EntityType } from "../adapter/";
import { ConstructDiscriminator } from "../content-bundle";
import {
    ActionRelationOperator,
    ArithmeticOperator,
    AssignmentOperator, Comparator,
    ExpressionDiscriminator,
    ReferencePathComponentDiscriminator
} from "../dsl";
import { VivInterpreterError } from "../errors";
import { GATEWAY } from "../gateway";
import { inscribeItem, inspectItem } from "../knowledge-manager";
import { queueConstruct } from "../queue-manager";
import { castRoles, precastRoles } from "../role-caster";
import { runActionSearch, runSiftingPattern } from "../story-sifter";
import {
    clone,
    dehydrateEntityReference,
    getActionDefinition,
    getActionSelectorDefinition,
    getPlanDefinition,
    getPlanSelectorDefinition,
    getQueryDefinition,
    getSiftingPatternDefinition,
    getTropeDefinition,
    hydrateEntityReference,
    isArray,
    isEntityOfType,
    isNumber,
    isPlainObject,
    isString,
    removeAll
} from "../utils";
import { EVAL_FAIL_SAFE_SENTINEL } from "./constants";
import {
    dehydrateExpressionValue,
    isActionView,
    isTruthy,
    isValidArrayIndex,
    isVivExpression,
    isVivExpressionOfType
} from "./utils";

/**
 * Interprets the given expression and returns its evaluation.
 *
 * @param expression - The Viv expression to evaluate.
 * @param context - The evaluation context, which namely contains role bindings.
 * @param shortCircuit - An internal flag that tells the interpreter it is evaluating a test-only clause,
 *     such as a condition, where the caller only requires a `true`/`false` result. When `shortCircuit`
 *     is `true`, any loop or conditional encountered inside the expression adopts fail-fast semantics:
 *     as soon as a body expression evaluates to a falsy value (`false`, `undefined`, or the
 *     {@link EVAL_FAIL_SAFE_SENTINEL}), that loop or conditional aborts immediately,
 *     the failure value is propagated upward, and the remainder of the iterations or branches are skipped.
 *     This lets the interpreter stop work the moment a condition fails, while ordinary evaluations (effects,
 *     scratch code, gloss rendering, etc.) call the function with the default argument `false`, ensuring
 *     their loops and conditionals run to completion and execute all intended side effects.
 * @returns The evaluation of the given expression, given the associated context.
 * @throws {VivInterpreterError} If the expression has an invalid type.
 */
export async function interpretExpression(
    expression: Expression,
    context: EvaluationContext,
    shortCircuit: boolean = false
): Promise<ExpressionValue> {
    // Save and restore debugging data across nested calls. These module-level variables are read by
    // `createInterpreterError()` to build diagnostics. The `finally` block ensures that after a child
    // expression returns successfully, the parent's expression is restored, which is necessary for cases
    // where the parent fails after a child has succeeded. In such cases, we want the error to identify
    // the parent, not the last child that happened to succeed. When a child expression throws, its error
    // object has already the child at construction time, so the restore doesn't affect that error.
    const topLevelExpression = CURRENT_EXPRESSION;
    const topLevelContext = CURRENT_EVALUATION_CONTEXT;
    CURRENT_EXPRESSION = expression;
    CURRENT_EVALUATION_CONTEXT = context;
    try {
        // Evaluate the expression
        let result;
        switch (expression.type) {
            // Literal expressions, which simply evaluate to their JSON-serializable values
            case ExpressionDiscriminator.Int:
            case ExpressionDiscriminator.Float:
            case ExpressionDiscriminator.String:
            case ExpressionDiscriminator.Bool:
            case ExpressionDiscriminator.NullType:
                result = expression.value;
                break;
            // Other unary expressions
            case ExpressionDiscriminator.ActionSearch:
                result = await evaluateActionSearch(expression.value, context);
                break;
            case ExpressionDiscriminator.CustomFunctionCall:
                result = await evaluateCustomFunctionCall(expression.value, context);
                break;
            case ExpressionDiscriminator.ChanceExpression:
                result = evaluateChanceExpression(expression.value);  // No context needed
                break;
            case ExpressionDiscriminator.Conditional:
                result = await evaluateConditional(expression.value, context, shortCircuit);
                break;
            case ExpressionDiscriminator.EntityReference:
                result = await evaluateEntityReference(expression.value, context);
                break;
            case ExpressionDiscriminator.Enum:
                result = await evaluateEnum(expression.value);  // No context needed
                break;
            case ExpressionDiscriminator.List:
                result = await evaluateList(expression.value, context);
                break;
            case ExpressionDiscriminator.Loop:
                result = await evaluateLoop(expression.value, context, shortCircuit);
                break;
            case ExpressionDiscriminator.Object:
                result = await evaluateObject(expression.value, context);
                break;
            case ExpressionDiscriminator.Reaction:
                // Note that reactions are allowed to be declared under a loop, which is why
                // evaluating a reaction declaration causes it to be queued via side effects.
                result = await evaluateReaction(expression.value, context);
                break;
            case ExpressionDiscriminator.Sifting:
                result = await evaluateSifting(expression.value, context);
                break;
            case ExpressionDiscriminator.SymbolReference:
                result = await evaluateSymbolReference(expression.value, context);
                break;
            case ExpressionDiscriminator.TemplateString:
                result = await evaluateTemplateString(expression.value, context);
                break;
            // Binary expressions
            case ExpressionDiscriminator.ActionRelation:
                result = await evaluateActionRelation(expression.value, context);
                break;
            case ExpressionDiscriminator.ArithmeticExpression:
                result = await evaluateArithmeticExpression(expression.value, context);
                break;
            case ExpressionDiscriminator.Assignment:
                result = await executeAssignment(expression.value, context);
                break;
            case ExpressionDiscriminator.Comparison:
                result = await evaluateComparison(expression.value, context);
                break;
            case ExpressionDiscriminator.Conjunction:
                result = await evaluateConjunction(expression.value, context);
                break;
            case ExpressionDiscriminator.Disjunction:
                result = await evaluateDisjunction(expression.value, context);
                break;
            case ExpressionDiscriminator.Inscription:
                result = await executeInscription(expression.value, context);
                break;
            case ExpressionDiscriminator.Inspection:
                result = await executeInspection(expression.value, context);
                break;
            case ExpressionDiscriminator.MembershipTest:
                result = await evaluateMembershipTest(expression.value, context);
                break;
            case ExpressionDiscriminator.MemoryCheck:
                result = await evaluateMemoryCheck(expression.value, context);
                break;
            case ExpressionDiscriminator.TropeFit:
                result = await evaluateTropeFit(expression.value, context);
                break;
            // Error cases
            case undefined:
                throw createInterpreterError("Expression has no type");
            default:
                throw createInterpreterError("Expression has unexpected type")
        }
        // Handle negation, if applicable
        if (isNegatable(expression) && expression.negated) {
            result = !isTruthy(result);
        }
        // Return the evaluation
        return result;
    } finally {
        // See the log note above about restoring the parent expression here
        CURRENT_EXPRESSION = topLevelExpression;
        CURRENT_EVALUATION_CONTEXT = topLevelContext;
    }
}

/**
 * Returns whether the given expression is a {@link NegatableExpression}.
 *
 * @param expression - The Viv expression in question.
 * @returns Whether the given expression is a {@link NegatableExpression}.
 */
function isNegatable(expression: Expression): expression is Expression & NegatableExpression {
    return "negated" in expression;
}

/**
 * Returns the evaluation of the given action relation, given the associated context.
 *
 * Note: If two actions `L` and `R` have the exact same timestamp, `L` will be deemed to have
 * preceded `R` iff `R` is not a causal ancestor of `L`. This may be slightly liberal, but a
 * policy is required because there is often only a partial temporal order among Viv actions.
 *
 * @param actionRelation - A Viv action relation.
 * @param context - A Viv evaluation context.
 * @returns The boolean result of testing the action relation.
 */
async function evaluateActionRelation(
    actionRelation: ActionRelationValue,
    context: EvaluationContext
): Promise<boolean> {
    // Evaluate the left and right operands
    let evaluatedLeft: ExpressionValue = await interpretExpression(actionRelation.left, context);
    let evaluatedRight: ExpressionValue = await interpretExpression(actionRelation.right, context);
    // If either operand evaluates to the eval fail-safe sentinel, we'll return `false` now
    if (evaluatedLeft === EVAL_FAIL_SAFE_SENTINEL || evaluatedRight === EVAL_FAIL_SAFE_SENTINEL) {
        return false;
    }
    // Next, we'll proactively hydrate any entity IDs
    evaluatedLeft = await hydrateEntityReference(evaluatedLeft);
    evaluatedRight = await hydrateEntityReference(evaluatedRight);
    // If either operand is now action data, throw an error now
    if (!isActionView(evaluatedLeft)) {
        throw createInterpreterError(
            "Cannot evaluate action relation: left operand is not action",
            { evaluatedLeft }
        );
    }
    if (!isActionView(evaluatedRight)) {
        throw createInterpreterError(
            "Cannot evaluate action relation: right operand is not action",
            { evaluatedRight }
        );
    }
    // Now test the relation
    switch (actionRelation.operator) {
        case ActionRelationOperator.Preceded:
            if (evaluatedLeft.timestamp < evaluatedRight.timestamp) {
                return true;
            } else if (evaluatedLeft.timestamp === evaluatedRight.timestamp) {
                return !evaluatedLeft.ancestors.includes(evaluatedRight.id);  // See note in the function doc above
            }
            return false;
        case ActionRelationOperator.Caused:
            return evaluatedRight.ancestors.includes(evaluatedLeft.id);
        case ActionRelationOperator.Triggered:
            return evaluatedRight.causes.includes(evaluatedLeft.id);
    }
}

/**
 * Returns the evaluation of the given custom-function call, given the associated context.
 *
 * A Viv custom-function call allows for the invocation of an arbitrary function exposed by the target
 * application in its Viv adapter, assuming the function is registered with the proper signature.
 *
 * @param customFunctionCall - A Viv adapter-function call.
 * @param context - A Viv evaluation context.
 * @returns The result of the custom-function call.
 * @throws {VivInterpreterError} If the function call itself fails, in which case the downstream
 *     error will bubble up into {@link VivInterpreterError.extraContext}.
 */
async function evaluateCustomFunctionCall(
    customFunctionCall: CustomFunctionCallValue,
    context: EvaluationContext,
): Promise<ExpressionValue> {
    // Evaluate the arguments
    const evaluatedArgs: ExpressionValue[] = [];
    for (const argExpression of customFunctionCall.args) {
        let evaluatedArg = await interpretExpression(argExpression, context);
        evaluatedArg = await dehydrateExpressionValue(evaluatedArg);
        evaluatedArgs.push(evaluatedArg);
    }
    // Invoke the function
    const customFunction = GATEWAY.functions[customFunctionCall.name];
    let result: ExpressionValue;
    try {
        result = await customFunction(...evaluatedArgs);
    } catch (error) {
        throw createInterpreterError("Call to custom function failed", null, error);
    }
    // Handle any fail-safe directive, if applicable
    if (result === undefined || result === null) {
        if (customFunctionCall.failSafe) {
            return EVAL_FAIL_SAFE_SENTINEL;
        }
    }
    // Otherwise, return the result
    return result;
}

/**
 * Returns the evaluation of the given arithmetic expression, given the associated context.
 *
 * @param arithmeticExpression - A Viv arithmetic expression.
 * @param context - A Viv evaluation context.
 * @returns The numeric result of the arithmetic expression.
 */
async function evaluateArithmeticExpression(
    arithmeticExpression: ArithmeticExpressionValue,
    context: EvaluationContext
): Promise<number | typeof EVAL_FAIL_SAFE_SENTINEL> {
    // Evaluate the operands. If either evaluates to the fail-safe sentinel,
    // we can just return that sentinel now.
    const evaluatedLeft = await interpretExpression(arithmeticExpression.left, context);
    const evaluatedRight = await interpretExpression(arithmeticExpression.right, context);
    if (evaluatedLeft === EVAL_FAIL_SAFE_SENTINEL || evaluatedRight === EVAL_FAIL_SAFE_SENTINEL) {
        return EVAL_FAIL_SAFE_SENTINEL;
    }
    // If either is not a number, throw an error
    if (!isNumber(evaluatedLeft) || !isNumber(evaluatedRight)) {
        throw createInterpreterError(
            "Cannot evaluate arithmetic expression: non-numeric operand(s)",
            { evaluatedLeft, evaluatedRight }
        );
    }
    // If we get to here, it's safe to evaluate
    switch (arithmeticExpression.operator) {  // Note: the Viv compiler checks for bad operators
        case ArithmeticOperator.Add:
            return evaluatedLeft + evaluatedRight;
        case ArithmeticOperator.Subtract:
            return evaluatedLeft - evaluatedRight;
        case ArithmeticOperator.Multiply:
            return evaluatedLeft * evaluatedRight;
        case ArithmeticOperator.Divide:
            if (evaluatedRight === 0) {
                throw createInterpreterError("Cannot evaluate arithmetic expression: division by zero");
            }
            return evaluatedLeft / evaluatedRight;
        default:
            throw createInterpreterError("Cannot evaluate arithmetic expression: unsupported operator");
    }
}

/**
 * Returns the evaluation of the given chance expression.
 *
 * A chance expression wraps a floating-point number in the range [0.0, 1.0], which holds
 * if a pseudorandom number in the range [0.0, 1.0] exceeds it.
 *
 * @param chance - A floating-point number in the range [0.0, 1.0],
 * @returns Whether the given `chance` value exceeds a pseudorandom number in the range [0.0, 1.0].
 */
function evaluateChanceExpression(chance: number): boolean {
    return Math.random() < chance;
}

/**
 * Returns the evaluation of the given comparison, given the associated context.
 *
 * @param comparison - A Viv comparison.
 * @param context - A Viv evaluation context.
 * @returns The boolean result of the comparison.
 * @throws {VivInterpreterError} If the comparator is arithmetic and an evaluated operand is non-numeric.
 */
async function evaluateComparison(comparison: ComparisonValue, context: EvaluationContext): Promise<boolean> {
    // Evaluate the left and right operands
    let evaluatedLeft: ExpressionValue = await interpretExpression(comparison.left, context);
    let evaluatedRight: ExpressionValue = await interpretExpression(comparison.right, context);
    // If either evaluation results in the eval fail-safe sentinel, we'll convert to undefined.
    // This enables an author to express something like `@person.boss? == @other`, which
    // reasonably should evaluate to `false`.
    evaluatedLeft = evaluatedLeft === EVAL_FAIL_SAFE_SENTINEL ? undefined : evaluatedLeft;
    evaluatedRight = evaluatedRight === EVAL_FAIL_SAFE_SENTINEL ? undefined : evaluatedRight;
    // Next, we'll proactively dehydrate any entity data. To allow authors to use expressions structured like
    // `@sender == @event.initiator` and also like `@sender == @receiver`, we need to be able to 1) compare
    // entity IDs to entity data, and also 2) compare entity data to entity data. We can do this by dehydrating
    // entity data objects back into their entity IDs. Note that this could lead to unexpected behavior if an
    // author accidentally uses e.g. `<` in a comparison, but this is a standard pitfall in programming.
    evaluatedLeft =
        dehydrateEntityReference(evaluatedLeft) as Exclude<ExpressionValue, symbol>;
    evaluatedRight =
        dehydrateEntityReference(evaluatedRight) as Exclude<ExpressionValue, symbol>;
    // Handle equality comparators
    switch (comparison.operator) {
        case Comparator.Equals:
            return evaluatedLeft === evaluatedRight;
        case Comparator.NotEquals:
            return evaluatedLeft !== evaluatedRight;
    }
    // Handle arithmetic comparators
    if (evaluatedLeft == null || evaluatedRight == null) {  // Note the double equals
        // TypeScript does not allow `null` or `undefined` as operands for these comparisons
        return false;
    }
    if (!isNumber(evaluatedLeft) || !isNumber(evaluatedRight)) {
        throw createInterpreterError(
            "Cannot evaluate comparison: non-numeric operand(s) with arithmetic comparator",
            { evaluatedLeft, evaluatedRight }
        );
    }
    switch (comparison.operator) {
        case Comparator.LessThan:
            return evaluatedLeft < evaluatedRight;
        case Comparator.GreaterThan:
            return evaluatedLeft > evaluatedRight;
        case Comparator.LessThanOrEqual:
            return evaluatedLeft <= evaluatedRight;
        case Comparator.GreaterThanOrEqual:
            return evaluatedLeft >= evaluatedRight;
        default:
            throw createInterpreterError("Cannot evaluate comparison: unsupported operator");
    }
}

/**
 * Returns the evaluation of the given conditional expression, given the associated context.
 *
 * For loops and conditionals, we follow the Lisp-family convention of returning the evaluation
 * of the last expression to appear in the evaluated body (e.g., see Scheme's `begin` statement).
 *
 * Note: If no branch fires, `true` is returned. See the long in-line comment below for an explanation.
 *
 * @param conditional - A Viv conditional expression.
 * @param context - A Viv evaluation context.
 * @param shortCircuit - An internal flag that tells the interpreter it is evaluating a test-only clause,
 *     such as a condition, where the caller only requires a `true`/`false` result. When `shortCircuit`
 *     is `true`, any loop or conditional encountered inside the expression adopts fail-fast semantics:
 *     as soon as a body expression evaluates to a falsy value (`false`, `undefined`, or the eval fail-safe
 *     symbol), that loop or conditional aborts immediately, the failure value is propagated upward, and
 *     the remainder of the iterations or branches are skipped. This lets the interpreter stop work the
 *     moment that, e.g., a condition fails.
 * @returns The evaluation of the last expression to appear in the evaluated body.
 */
async function evaluateConditional(
    conditional: ConditionalValue,
    context: EvaluationContext,
    shortCircuit: boolean
): Promise<ExpressionValue> {
    let atLeastOneBranchFired = false;
    let result: ExpressionValue;
    for (const branch of conditional.branches) {
        const conditionHolds = isTruthy(await interpretExpression(branch.condition, context, shortCircuit));
        if (conditionHolds) {
            for (const consequentExpression of branch.consequent) {
                result = await interpretExpression(consequentExpression, context, shortCircuit);
                // A `shortCircuit` argument of true will propagate to here if we are ultimately in the middle
                // of e.g. evaluating a condition body. In such cases, we need to immediately return `false`
                // upon encountering a failed condition.
                if (shortCircuit) {
                    if (!isTruthy(result)) {
                        return false;
                    }
                }
            }
            atLeastOneBranchFired = true;
            break;
        }
    }
    if (!atLeastOneBranchFired) {
        if (conditional.alternative) {
            for (const alternativeExpression of conditional.alternative) {
                result = await interpretExpression(alternativeExpression, context, shortCircuit);
                // See the above comment about 'shortCircuit'
                if (shortCircuit) {
                    if (!isTruthy(result)) {
                        return false;
                    }
                }
            }
        } else {
            // If we get to here, the condition does not hold and there's no alternative. Somewhat
            // counterintuitively, we need to ultimately return true in this case. Imagine an action
            // with a single condition `if false: false`. The condition (the first `false`) won't
            // hold, so we don't actually check the condition body (the second `false`). As such,
            // no condition has explicitly failed, which means the action should be taken. Note that
            // there can be some complications in the case of a field declaration. For instance, in
            // the following example, `@student` would get an association of `true`:
            //          associations:
            //              student:
            //                  if false:
            //                      boring
            //                  end
            // It seems that the best solution here is to guard against `true` values for field
            // declarations when Viv produces them through evaluation here. This approach is ultimately
            // feasible because field declarations are only used in the `saliences` and `associations`
            // fields, which are both handled by the knowledge manager.
            return true;
        }
    }
    // For loops and conditionals, we follow the Lisp-family convention of returning the evaluation
    // of the last expression to appear in the evaluated body (e.g., see Scheme's 'begin' statement).
    return result;
}

/**
 * Returns the evaluation of the given conjunction, given the associated context.
 *
 * The policy here is conventional: return the first falsy operand, else the last operand if all are truthy.
 *
 * @param conjunction - A Viv conjunction.
 * @param context - A Viv evaluation context.
 * @returns The first falsy operand, else the last operand if all are truthy.
 */
async function evaluateConjunction(
    conjunction: ConjunctionValue,
    context: EvaluationContext
): Promise<ExpressionValue> {
    let result;
    for (const operand of conjunction.operands) {
        result = await interpretExpression(operand, context);
        // A slight nuance: if the result is the fail-safe marker, we'll return `false` here,
        // as opposed to the marker itself (hence the need for this separate check).
        if (result === EVAL_FAIL_SAFE_SENTINEL) {
            return false;
        } else if (!isTruthy(result)) {
            return result;
        }
    }
    return result;
}

/**
 * Returns the evaluation of the given disjunction, given the associated context.
 *
 * The policy here is conventional: return the first truthy operand, else the last operand if all are falsy.
 *
 * @param disjunction - A Viv disjunction.
 * @param context - A Viv evaluation context.
 * @returns The first truthy operand, else the last operand if all are falsy.
 */
async function evaluateDisjunction(
    disjunction: DisjunctionValue,
    context: EvaluationContext
): Promise<ExpressionValue> {
    let result;
    for (const operand of disjunction.operands) {
        result = await interpretExpression(operand, context);
        if (isTruthy(result)) {
            return result;
        }
    }
    return result;
}

/**
 * Returns the evaluation of the given entity reference, given the associated context.
 *
 * @param entityReference - A Viv entity reference.
 * @param context - A Viv evaluation context.
 * @returns The evaluated reference.
 * @throws {VivInterpreterError} If the anchor is not an entity ID.
 */
async function evaluateEntityReference(
    entityReference: ReferenceValue,
    context: EvaluationContext
): Promise<ExpressionValue> {
    // First, let's isolate the 'anchor' of this reference, which should be an entity. For instance, in the
    // example reference `@insulter.father->friends`, the entity bound to `insulter` would be our anchor.
    let evaluatedAnchor: ExpressionValue;
    if (entityReference.group) {
        evaluatedAnchor = unpackGroupRole(entityReference.anchor, context);
    } else {
        // Retrieve the entity ID for the entity anchoring this reference
        const anchorEntityID =
            entityReference.local
                ? context.__locals__[entityReference.anchor]
                : context[entityReference.anchor];
        // If the anchor is nullish, and if it has an attached eval fail-safe marker,
        // return the eval fail-safe sentinel now.
        if (anchorEntityID === undefined || anchorEntityID === null) {
            if (entityReference.failSafe) {
                return EVAL_FAIL_SAFE_SENTINEL;
            }
        }
        // If this is not an entity ID, throw an error now
        if (!isString(anchorEntityID) || !(await GATEWAY.isEntityID(anchorEntityID))) {
            throw createInterpreterError("Cannot evaluate reference: anchor is not entity");
        }
        // Otherwise, retrieve the anchor's entity data
        evaluatedAnchor = await GATEWAY.getEntityView(anchorEntityID);
    }

    // If there's no reference path, we can return the evaluated anchor now
    if (!entityReference.path.length) {
        return evaluatedAnchor;
    }
    // Otherwise, walk the reference path to retrieve the specified data. For instance, in the example
    // from above, `@insulter.father->friends`, the property path would be `father->friends`.
    const evaluation = await retrieveValueViaReferencePath(evaluatedAnchor, entityReference, context);
    // If we get to here, the final evaluation was not `undefined`, so we can safely
    // return it. Note however that it may be the eval fail-safe sentinel.
    return evaluation;
}

/**
 * Returns the evaluation of the given symbol reference, given the associated context.
 *
 * @param symbolReference - A Viv symbol reference.
 * @param context - A Viv evaluation context.
 * @returns The evaluated reference.
 * @throws {VivInterpreterError} If the reference anchor is not defined.
 */
async function evaluateSymbolReference(
    symbolReference: ReferenceValue,
    context: EvaluationContext
): Promise<ExpressionValue> {
    // First, let's get the 'anchor' data
    let evaluatedAnchor: ExpressionValue;
    if (symbolReference.group) {
        evaluatedAnchor = unpackGroupRole(symbolReference.anchor, context);
    } else if (symbolReference.local) {
        evaluatedAnchor = context.__locals__[symbolReference.anchor];
    } else {
        evaluatedAnchor = context[symbolReference.anchor];
    }
    // If the anchor is nullish, and if it has an attached eval fail-safe marker,
    // return the eval fail-safe sentinel now.
    if (evaluatedAnchor === undefined || evaluatedAnchor === null) {
        if (symbolReference.failSafe) {
            return EVAL_FAIL_SAFE_SENTINEL;
        }
    }
    // If there is no fail-safe marker and the anchor is not defined, throw an error now
    if (evaluatedAnchor === undefined) {
        throw createInterpreterError("Cannot evaluate reference: anchor evaluated to undefined");
    }
    // If there's no reference path to walk, we can return the evaluated value now
    if (!symbolReference.path.length) {
        return evaluatedAnchor;
    }
    // Otherwise, walk the reference path to retrieve the specified data
    const evaluation = await retrieveValueViaReferencePath(evaluatedAnchor, symbolReference, context);
    // If we get to here, the final evaluation was not `undefined`, so we can safely
    // return it. Note however that it may be the eval fail-safe sentinel.
    return evaluation;
}

/**
 * Returns an array containing the bindings for the given group role.
 *
 * Because it is quite possible for an author to create a group role that casts symbols,
 * the return value here allows for either an array of entity IDs or an array of
 * symbol-role literal values (always homogenous and never mixed).
 *
 * @param nameOfRoleToUnpack - The name of the role to unpack.
 * @param context - A Viv evaluation context.
 * @returns An array containing the bindings for the given group role.
 */
function unpackGroupRole(nameOfRoleToUnpack: RoleName, context: EvaluationContext): GroupMember[] {
    // Here, we rely on the special `__groups__` property of the context. This will always
    // be present, whether we're evaluating conditions, executing effects, or queueing
    // reactions. We have to pass the bindings in through the context because we cannot
    // know when exactly this method will be invoked.
    if (!(nameOfRoleToUnpack in context.__groups__)) {
        // This occurs when we're attempting to unpack an optional role for which
        // no entities were cast. In this case, we can just return an empty array.
        return [];
    }
    // We clone here because an author might do something like `$@group = @foo*` `$@group append @bar`,
    // in which case we don't want them to modify the actual 'foo' bindings.
    const roleEntityIDs = clone<GroupMember[]>(context.__groups__[nameOfRoleToUnpack]);
    return roleEntityIDs;
}

/**
 * Retrieves a property value by starting with an evaluated anchor object and then walking
 * a path that is structured as an ordered sequence of property names, pointers, or lookups.
 *
 * @param evaluatedAnchor - The evaluated anchor object that we will walk, using the given path as our
 *     guide. If we are evaluating an entity reference, this will be entity data or an array of entity
 *     IDs (if it's a group role). If we are evaluating a symbol reference, this could be any kind of
 *     value, including entity data.
 * @param reference - The reference expression containing the path to walk.
 * @param context - A Viv evaluation context.
 * @returns The property value stored at the given path, if the path can be traversed, else an
 *     eval fail-safe sentinel, assuming the author placed one after the path segment from which
 *     navigation couldn't proceed (because it followed a missing property).
 * @throws {VivInterpreterError} If any intermediate point along the path results in a nullish value,
 *     and if the author did not follow this point with an eval fail-safe marker. We throw here because
 *     the reference cannot be evaluated past that point).
 * @throws {VivInterpreterError} If the final result is `undefined`, because out of precaution Viv
 *     does not allow users to set `undefined` values.
 */
async function retrieveValueViaReferencePath(
    evaluatedAnchor: ExpressionValue,
    reference: ReferenceValue,
    context: EvaluationContext
): Promise<ExpressionValue> {
    // Start walking the reference path
    let evaluation: ExpressionValue = evaluatedAnchor;  // The current evaluation at each point
    for (const [i, pathComponent] of reference.path.entries()) {
        // If the current evaluation is nullish, we need to throw an error at this point, because there is at
        // least one additional component of the path -- the current `pathComponent`, which we are about to
        // handle -- and obviously this cannot be traversed given the current evaluation. Note that there
        // was no eval fail-safe marker at this point in the path, since if there was, we would have
        // already handled it in the last iteration of the loop.
        if (evaluation === undefined || evaluation === null) {
            const msg = (
                "Cannot evaluate reference: nullish intermediate evaluation is not followed "
                + "by the eval fail-safe marker ('?')"
            )
            throw createInterpreterError(msg, { failurePoint: reference.path[i] });
        }
        // Otherwise, let's move onto the next component of the path
        switch (pathComponent.type) {
            // If the next component is a property name, we can simply attempt the access
            case ReferencePathComponentDiscriminator.ReferencePathComponentPropertyName:
                if (isPlainObject(evaluation) || isArray(evaluation)) {
                    // Arrays are included here to allow for e.g. `@foo.bar.length`
                    evaluation = (evaluation as any)[pathComponent.name] as ExpressionValue;
                } else {
                    evaluation = undefined;
                }
                break;
            // If it's a pointer to the property of another entity, we need to pull down that entity's data and
            // then attempt to access its property in question. In Viv, pointers are expressed in arrow notation,
            // borrowed from C. For instance, in the Viv expression `@winner.spouse->bestFriend`, we would evaluate
            // the bit `@winner.spouse` component an entity ID for the winner's spouse, hydrate the entity ID into
            // entity data (using the adapter), and then finally evaluate the rest of the expression to the entity
            // ID corresponding to the winner's spouse's best friend.
            case ReferencePathComponentDiscriminator.ReferencePathComponentPointer:
                const entityID: unknown = evaluation;  // Should be an entity ID (the pointer target)
                if (!isString(entityID) || !(await GATEWAY.isEntityID(entityID))) {
                    evaluation = undefined;
                    break;
                }
                const entityView = await GATEWAY.getEntityView(entityID);
                evaluation = entityView[pathComponent.propertyName];  // May be undefined now
                break;
            case ReferencePathComponentDiscriminator.ReferencePathComponentLookup:
                evaluation = await retrieveValueViaLookup(evaluation, pathComponent, context);
                break;
        }
        // If the new evaluation is nullish, and if the current path component has an attached
        // eval fail-safe marker, return the eval fail-safe sentinel now.
        if (evaluation === undefined || evaluation === null) {
            if (pathComponent.failSafe) {
                return EVAL_FAIL_SAFE_SENTINEL;
            }
        }
    }
    // If we end up with an `undefined` value, we need to throw an error now, because Viv
    // does not allow authors to set `undefined` values, as a matter of precaution.
    if (evaluation === undefined) {
        throw createInterpreterError(
            "Cannot evaluate reference: result is undefined and is "
            + "not followed by the eval fail-safe marker ('?')"
        );
    }
    return evaluation;
}

/**
 * Performs the given lookup on the given anchor and returns the result.
 *
 * If the anchor is an array, the lookup is an array access. Otherwise, it should
 * be a plain object, in which case it's a property lookup.
 *
 * @param evaluatedAnchor - The array or plain object on which the lookup (array access
 *     or property lookup) will be performed.
 * @param lookup - A Viv lookup.
 * @param context - A Viv evaluation context.
 * @returns The result of the lookup.
 * @throws {VivInterpreterError} If the given anchor is not an array or plain object.
 * @throws {VivInterpreterError} If index/key is invalid for the anchor type.
 * @throws {VivInterpreterError} If the lookup/access results in `undefined` and the lookup has no `failSafe` flag.
 */
async function retrieveValueViaLookup(
    evaluatedAnchor: ExpressionValue,
    lookup: ReferencePathComponentLookup,
    context: EvaluationContext
): Promise<ExpressionValue> {
    // Evaluate the lookup key (may be an array index)
    const evaluatedKey = await interpretExpression(lookup.key, context);
    // Attempt to perform the lookup/access
    let result: ExpressionValue | undefined;
    if (isArray(evaluatedAnchor)) {
        if (!isValidArrayIndex(evaluatedKey)) {
            // If the evaluated key is not a non-negative integer, we cannot perform
            // the access, so throw an error now.
            throw createInterpreterError(
                "Cannot evaluate lookup/access: target is array but index is not a non-negative integer",
                { evaluatedAnchor, evaluatedIndex: evaluatedKey }
            );
        }
        result = (evaluatedAnchor as ExpressionValue[])[evaluatedKey];
    } else if (isPlainObject(evaluatedAnchor)) {
        if (!isString(evaluatedKey)) {
            // If the evaluated key is not a string, we cannot perform the lookup, so throw an error now
            throw createInterpreterError(
                "Cannot evaluate lookup/access: target is plain object but key is not a string",
                { evaluatedAnchor, evaluatedKey }
            );
        }
        result = (evaluatedAnchor as Record<string, ExpressionValue>)[evaluatedKey];
    } else {
        throw createInterpreterError(
            "Cannot evaluate lookup/access: target is not array or plain object",
            { evaluatedAnchor }
        );
    }
    // If the result is nullish, and if the lookup has an attached eval fail-safe
    // declaration, return the eval fail-safe marker now.
    if (result === undefined || result === null) {
        if (lookup.failSafe) {
            return EVAL_FAIL_SAFE_SENTINEL;
        }
    }
    // If the result is `undefined` and the lookup does *not* have an attached
    // eval fail-safe marker, we need to throw an error.
    if (result === undefined) {
        if (isArray(evaluatedAnchor)) {
            throw createInterpreterError(
                "Cannot evaluate lookup/access: target is array and index is out of bounds",
                { evaluatedTarget: evaluatedAnchor, evaluatedKey }
            );
        } else {
            const msg = (
                "Cannot evaluate lookup/access: target is plain object, key is not present, and the "
                + "lookup is not followed by the eval fail-safe marker ('?')"
            )
            throw createInterpreterError(msg, { evaluatedTarget: evaluatedAnchor, evaluatedKey });
        }
    }
    return result;
}

/**
 * Returns the evaluation of the given enum, by making use of the host application gateway.
 *
 * Here, the interpreter will honor any scaling directive, as applicable.
 *
 * @param enumExpression - A Viv enum.
 * @returns The enum value furnished by the host application.
 * @throws {VivInterpreterError} If the minus sign is used with a string enum.
 */
async function evaluateEnum(enumExpression: Enum["value"]): Promise<number|string> {
    // Retrieve the enum value. Because Viv already confirmed during initialization that each
    // enum is defined in the host application, it's safe to assume we have a value here.
    let enumValue = GATEWAY.enums[enumExpression.name];
    // Handle use of a minus sign
    if (enumExpression.minus) {
        if (!isNumber(enumValue)) {
            throw createInterpreterError("Cannot evaluate bad enum: minus cannot be used with string value");
        }
        enumValue = -enumValue;
    }
    // Return the final enum value
    return enumValue;
}

/**
 * Returns the evaluation of the given list, given the associated context.
 *
 * A Viv list is an array of Viv expressions, and its evaluation is an array
 * containing the evaluations of those expressions, in the same order.
 *
 * @param list - A Viv list.
 * @param context - A Viv evaluation context.
 * @returns The evaluated list.
 * @throws {VivInterpreterError} If any expression in the list evaluates to undefined.
 */
async function evaluateList(list: ListField["value"], context: EvaluationContext): Promise<ExpressionValue[]> {
    const evaluatedList: ExpressionValue[] = [];
    for (const elementExpression of list) {
        const evaluatedElement = await interpretExpression(elementExpression, context);
        if (evaluatedElement === undefined) {
            throw createInterpreterError(
                "Cannot evaluate list: element evaluated to undefined",
                { elementExpression }
            );
        }
        evaluatedList.push(evaluatedElement);
    }
    return evaluatedList;
}

/**
 * Returns the evaluation of the given loop, given the associated context.
 *
 * For loops and conditionals, we follow the Lisp-family convention of returning the evaluation
 * of the last expression to appear in the evaluated body (e.g., see Scheme's `begin` statement).
 *
 * @param loop - A Viv loop.
 * @param context - A Viv evaluation context.
 * @param shortCircuit - An internal flag that tells the interpreter it is evaluating a test-only clause,
 *     such as a condition, where the caller only requires a `true`/`false` result. When `shortCircuit`
 *     is `true`, any loop or conditional encountered inside the expression adopts fail-fast semantics:
 *     as soon as a body expression evaluates to a falsy value (`false`, `undefined`, or the eval fail-safe
 *     symbol), that loop or conditional aborts immediately, the failure value is propagated upward, and
 *     the remainder of the iterations or branches are skipped. This lets the interpreter stop work the
 *     moment that, e.g., a condition fails.
 * @returns The evaluation of the last expression to appear in the evaluated body.
 * @throws {VivInterpreterError} If the loop iterable does not evaluate to an array.
 * @throws {VivInterpreterError} If the loop variable is marked entity but does not evaluate
 *     to an entity on a given iteration.
 */
async function evaluateLoop(
    loop: LoopValue,
    context: EvaluationContext,
    shortCircuit: boolean
): Promise<ExpressionValue> {
    // Partially clone the context, so that we can scope the loop variable to the loop only
    const contextOverlay: EvaluationContext = {
        ...context,
        __locals__: clone<Record<VariableName, ExpressionValue>>(context.__locals__),
        __groups__: clone<Record<RoleName, GroupMember[]>>(context.__groups__),
        __causes__: context.__causes__ ? [...context.__causes__] : undefined,
    } as EvaluationContext;  // Needed because TypeScript can't verify the `__searchDomain__` field after spreading
    // Attempt to evaluate the collection, the evaluated members of which will be iterated
    // over in turn, with each being assigned to the loop variable during its iteration.
    const evaluatedIterable = await interpretExpression(loop.iterable, context);
    if (!isArray(evaluatedIterable)) {
        throw createInterpreterError(
            "Cannot execute loop expression: iterable is not array",
            { evaluatedIterable }
        );
    }
    // Start iterating
    let result: ExpressionValue = undefined;
    for (let i = 0; i < evaluatedIterable.length; i++) {
        if (i === GATEWAY.config.loopMaxIterations) {
            break;
        }
        let evaluatedIterableElement = evaluatedIterable[i] as ExpressionValue;
        if (loop.variable.isEntityVariable) {
            evaluatedIterableElement = dehydrateEntityReference(evaluatedIterableElement);
            if (!isString(evaluatedIterableElement) || !(await GATEWAY.isEntityID(evaluatedIterableElement))) {
                throw createInterpreterError(
                    "Cannot execute loop expression: non-entity bound to entity loop variable",
                    { evaluatedIterable, evaluatedIterableElement }
                );
            }
        }
        contextOverlay.__locals__[loop.variable.name] = evaluatedIterableElement;
        for (const loopBodyExpression of loop.body) {
            result = await interpretExpression(loopBodyExpression, contextOverlay, shortCircuit);
            // A `shortCircuit` argument of `true` will propagate to here if we are ultimately in the
            // middle of evaluating e.g. a condition body. In such cases, we need to immediately
            // return` false` upon encountering a failed condition.
            if (shortCircuit) {
                if (!isTruthy(result)) {
                    return false;
                }
            }
        }
    }
    // For loops and conditionals, we follow the Lisp-family convention of returning the evaluation
    // of the last expression to appear in the evaluated body (e.g., see Scheme's `begin` statement).
    return result;
}

/**
 * Returns the evaluation of the given membership test, given the associated context.
 *
 * Viv affords membership tests via an 'in' operator, which mirrors the semantics Python's 'in' operator.
 *
 * @param membershipTest - A Viv membership test.
 * @param context - A Viv evaluation context.
 * @returns The boolean result of the membership test.
 */
async function evaluateMembershipTest(
    membershipTest: MembershipTestValue,
    context: EvaluationContext
): Promise<boolean> {
    // Retrieve the operands
    const item = membershipTest.item;
    const collection = membershipTest.collection;
    // Evaluate the item and collection operands. If either evaluates to the
    // fail-safe sentinel, we can just return `false` for this test now.
    let evaluatedItem = await interpretExpression(item, context);
    let evaluatedCollection = await interpretExpression(collection, context);
    if (evaluatedItem === EVAL_FAIL_SAFE_SENTINEL || evaluatedCollection === EVAL_FAIL_SAFE_SENTINEL) {
        return false;
    }
    // Dehydrate the operands. This allows for testing whether an entity is a member
    // of the collection, which is the most common use case for the notation.
    evaluatedItem = await dehydrateExpressionValue(evaluatedItem);
    evaluatedCollection = await dehydrateExpressionValue(evaluatedCollection);
    // Test for membership, using the semantics of the Python 'in' operator
    if (isArray(evaluatedCollection)) {
        return evaluatedCollection.includes(evaluatedItem);
    } else if (isPlainObject(evaluatedCollection)) {
        if (!isString(evaluatedItem) && !isNumber(evaluatedItem)) {
            return false;
        }
        return evaluatedItem in evaluatedCollection;
    }
    // If we got a strange value on the RHS, we'll return false. Perhaps should we emit a warning, though?
    return false;
}

/**
 * Returns the evaluation of the given memory check, given the associated context.
 *
 * A memory check determines whether a given character knows about a given action.
 *
 * @param memoryCheck - A Viv memory check.
 * @param context - A Viv evaluation context.
 * @returns The boolean result of the memory check.
 * @throws {VivInterpreterError} If one or both operands do not evaluate to entities.
 */
async function evaluateMemoryCheck(memoryCheck: MemoryCheckValue, context: EvaluationContext): Promise<boolean> {
    // Evaluate the operands.
    let evaluatedCharacter = await interpretExpression(memoryCheck.character, context);
    let evaluatedAction = await interpretExpression(memoryCheck.action, context);
    // If either evaluates to the fail-safe sentinel, we can just return `false` for this test now
    if (evaluatedCharacter === EVAL_FAIL_SAFE_SENTINEL || evaluatedAction === EVAL_FAIL_SAFE_SENTINEL) {
        return false;
    }
    // Dehydrate the operands
    const characterID = await dehydrateExpressionValue(evaluatedCharacter);
    const actionID = await dehydrateExpressionValue(evaluatedAction);
    // Confirm that the dehydrated evaluated operands are indeed entity IDs. If one or both are not
    // entity IDs, we'll throw an error now.
    if (!isString(characterID) || !(await GATEWAY.isEntityID(characterID))) {
        throw createInterpreterError(
            "Cannot evaluate memory check: character is not entity",
            { characterID }
        );
    }
    if (!isString(actionID) || !(await GATEWAY.isEntityID(actionID))) {
        throw createInterpreterError(
            "Cannot evaluate memory check: action is not entity",
            { actionID }
        );
    }
    // If we get to here, we can safely conduct the memory check
    const memory = await GATEWAY.getCharacterMemory(characterID, actionID);
    return !!memory && !memory.forgotten;
}

/**
 * Returns the evaluation of the given object, given the associated context.
 *
 * @param object - A Viv object literal.
 * @param context - A Viv evaluation context.
 * @returns The evaluated object.
 */
async function evaluateObject(
    object: ObjectField["value"],
    context: EvaluationContext
): Promise<Record<string, ExpressionValue>> {
    const evaluatedObject: Record<string, ExpressionValue> = {};
    // For each key in the raw object (a string), evaluate its raw value (a Viv expression),
    // and then update the actual evaluated object that we are constructing.
    for (const key in object) {
        const evaluatedValue = await interpretExpression(object[key], context);
        evaluatedObject[key] = evaluatedValue;
    }
    return evaluatedObject;
}

/**
 * Returns the evaluation of the given action search, given the associated context.
 *
 * @param actionSearch - A Viv action search.
 * @param context - A Viv evaluation context.
 * @returns An array containing entity IDs for all actions matching the query.
 */
async function evaluateActionSearch(actionSearch: ActionSearchValue, context: EvaluationContext): Promise<UID[]> {
    let queryDefinition: QueryDefinition | null = null;
    let precastBindings: RoleBindings = {};
    if (actionSearch.queryName) {
        queryDefinition = getQueryDefinition(actionSearch.queryName);
        precastBindings = await precastRoles(queryDefinition, actionSearch.bindings, context);
    }
    return await runActionSearch(queryDefinition, precastBindings, actionSearch.searchDomain, context);
}

/**
 * Processes a reaction by invoking the queue manager to queue the associated construct, and then returns
 * the UID for the resulting queued construct.
 *
 * Queueing occurs via side effects, because a reaction expression may appear inside a loop or a conditional
 * expression, in which case it would be gnarly to bubble up as needed. Instead, the semantics here are that
 * evaluation of a reaction declaration causes queueing of a construct and evaluates to the UID for the
 * resulting queued construct.
 *
 * Note: We return a UID here because the planner requires this to handle reaction windows.
 *
 * @param reactionDeclaration - A Viv reaction.
 * @param context - A Viv evaluation context.
 * @returns The UID for the queued construct resulting from this reaction.
 */
async function evaluateReaction(reactionDeclaration: ReactionValue, context: EvaluationContext): Promise<UID> {
    // First, evaluate any precast bindings and prepare an evaluation context for use by the queue manager
    let constructDefinition: ReactionTargetConstruct;
    switch (reactionDeclaration.targetType) {
        case ConstructDiscriminator.Action:
            constructDefinition = getActionDefinition(reactionDeclaration.targetName);
            break;
        case ConstructDiscriminator.ActionSelector:
            constructDefinition = getActionSelectorDefinition(reactionDeclaration.targetName);
            break;
        case ConstructDiscriminator.Plan:
            constructDefinition = getPlanDefinition(reactionDeclaration.targetName);
            break;
        case ConstructDiscriminator.PlanSelector:
            constructDefinition = getPlanSelectorDefinition(reactionDeclaration.targetName);
            break;
        default:
            throw createInterpreterError("Cannot process reaction: unsupported target type");
    }
    const precastBindings = await precastRoles(constructDefinition, reactionDeclaration.bindings, context);
    // Now invoke the queue manager to queue the construct
    return await queueConstruct(constructDefinition, precastBindings, reactionDeclaration, context);
}

/**
 * Runs the specified sifting pattern with the specified bindings, returning a single match upon success, else `null`.
 *
 * @param sifting - A Viv sifting expression.
 * @param context - A Viv evaluation context.
 * @returns A single sifting match, if there is one, else `null`.
 */
async function evaluateSifting(sifting: SiftingValue, context: EvaluationContext): Promise<SiftingMatch | null> {
    const patternDefinition = getSiftingPatternDefinition(sifting.patternName);
    const precastBindings = await precastRoles(patternDefinition, sifting.bindings, context);
    return await runSiftingPattern(patternDefinition, precastBindings, sifting.searchDomain, context);
}

/**
 * Returns the evaluation of the given template string, given the associated context.
 *
 * The result is produced by concatenating, in order, the literal string components and the
 * rendered template gaps. Template gaps are rendered by evaluating the expressions placed
 * in the gaps -- if this produces any entity IDs, an adapter function is called to produce
 * string labels for the entities, otherwise the evaluated value is concatenated.
 *
 * @param templateString - A Viv template string.
 * @param context - A Viv evaluation context.
 * @returns A string produced by rendering all template gaps.
 */
async function evaluateTemplateString(
    templateString: TemplateStringField["value"],
    context: EvaluationContext
): Promise<string> {
    let renderedString = '';
    for (const component of templateString) {
        if (isVivExpression(component)) {
            const renderedGap = await renderTemplateGap(component, context);
            renderedString += renderedGap;
        } else {
            renderedString += component;
        }
    }
    return renderedString;
}

/**
 * Renders the given gap in a templated string, and returns the result.
 *
 * @param templateGap - A Viv expression constituting a template gap.
 * @param context - A Viv evaluation context.
 * @returns A string produced by rendering all template gaps.
 */
async function renderTemplateGap(templateGap: Expression, context: EvaluationContext): Promise<string> {
    // In all other cases, we have a value that may be an entity ID. If it is an entity ID, we'll request
    // an entity label (e.g., the name of the entity) from the host application's Viv adapter. If it's
    // not an entity ID, we'll simply use the value itself (stringified to be safe).
    let renderedGap: string;
    // First, evaluate the gap expression and dehydrate the result
    let evaluatedGap = await interpretExpression(templateGap, context);
    evaluatedGap = await dehydrateExpressionValue(evaluatedGap);
    // If this is an array, we'll string together labels for each element in the array
    if (isArray(evaluatedGap)) {
        const groupRoleMemberLabels: string[] = [];
        for (const groupRoleMember of evaluatedGap) {
            let groupRoleMemberLabel: string;
            if (isString(groupRoleMember) && await GATEWAY.isEntityID(groupRoleMember)) {
                groupRoleMemberLabel = await GATEWAY.getEntityLabel(groupRoleMember);
            } else {
                groupRoleMemberLabel = String(groupRoleMember);
            }
            groupRoleMemberLabels.push(groupRoleMemberLabel);
        }
        return groupRoleMemberLabels.join(', ');
    }
    // Otherwise, if the evaluated gap is an entity ID, we need to request an entity label from the adapter
    if (isString(evaluatedGap) && (await GATEWAY.isEntityID(evaluatedGap))) {
        renderedGap = await GATEWAY.getEntityLabel(evaluatedGap);
    } else {
        // Otherwise, we'll just cast the value to a string
        renderedGap = String(evaluatedGap);
    }
    return renderedGap;
}

/**
 * Returns the evaluation of the given trope-fit expression, given the associated context.
 *
 * @param tropeFitExpression - A Viv trope-fit expression.
 * @param context - A Viv evaluation context.
 * @returns Whether the trope-fit expression holds, given the associated context.
 */
async function evaluateTropeFit(tropeFitExpression: TropeFitValue, context: EvaluationContext): Promise<boolean> {
    const tropeDefinition = getTropeDefinition(tropeFitExpression.tropeName);
    const precastBindings = await precastRoles(tropeDefinition, tropeFitExpression.bindings, context);
    const searchDomain = context.__searchDomain__ ?? null;
    const roleCastingResult = await castRoles(tropeDefinition, precastBindings, searchDomain);
    return !!roleCastingResult.bindings;
}

/**
 * Updates the data for some entity in the host application, via an adapter function.
 *
 * Note that we return `true` no matter what here because conditions can use loops,
 * which can include assignments. It's probably a bad idea to specify side effects like
 * an assignment inside a set of conditions, but nonetheless those conditions
 * should not fail because of that. As such, we must return a truthy value here.
 *
 * @param assignment - A Viv assignment.
 * @param context - A Viv evaluation context.
 * @returns `true`.
 */
async function executeAssignment(assignment: AssignmentValue, context: EvaluationContext): Promise<true> {
    // First, extract the update data
    const result = await prepareAssignmentUpdateData(assignment, context);
    // If we received the eval fail-safe sentinel, abort the assignment now
    if (result === EVAL_FAIL_SAFE_SENTINEL) {
        return true;
    }
    // Otherwise, evaluate the right-hand side (RHS) of the assignment
    const assignmentTargetData = result as AssignmentTargetData;
    let evaluatedRight = await interpretExpression(assignment.right, context);
    // If the RHS evaluates to the eval fail-safe sentinel, abort the assignment now
    if (evaluatedRight === EVAL_FAIL_SAFE_SENTINEL) {
        return true;
    }
    // Next, derive the new property value to assign
    const newValue = deriveUpdateValue(assignment, assignmentTargetData.currentValue, evaluatedRight);
    // Finally, execute the update. If we are updating a local variable, we will mutate the evaluation
    // context in place. If we are updating entity data, we will invoke the host application's Viv
    // adapter to actually execute the update -- but only after we have dehydrated the new value.
    if (assignmentTargetData.localVariable) {
        // Lodash's autovivification semantics when a path array is passed in: when a missing intermediate
        // value is encountered, make it an array only if the next key is a non-negative integer, otherwise
        // make it a plain object.
        const propertyPathArray = [assignmentTargetData.localVariable, ...assignmentTargetData.propertyPathArray];
        set(context.__locals__, propertyPathArray, newValue);
    } else if (assignmentTargetData.entityID) {
        // Proactively dehydrate the new value. For updates to entity data, we always proactively dehydrate the
        // value to set, meaning that any entity data objects contained in the value will be converted into entity
        // IDs. This is done to prevent a bevy of potential issues, namely the persisting of old entity snapshots
        // and bloating of state.
        const dehydratedNewValue = await dehydrateExpressionValue(newValue);
        // Invoke the host application gateway to persist the update
        await GATEWAY.updateEntityProperty(
            assignmentTargetData.entityID,
            assignmentTargetData.propertyPathArray,
            dehydratedNewValue
        );
    }
    // Again, we must return `true` here no matter what, to support conditionals and loops that are placed
    // inside of conditions and that include updates. This is likely not a strong pattern to use
    // (placing updates into conditions), but my goal here is to reflect standard Lisp-like behavior.
    return true;
}

/**
 * Walks the given assignment's LHS to construct an object specifying the property to be updated by an assignment.
 *
 * Note: Viv supports *autovivification* (no pun intended) in assignments, meaning authors can implicitly
 * set properties that do not yet exist, including intermediate properties. For instance, the assignment
 * `@person.foo.bar.baz = 77` will still be valid even if `@person.foo` does not yet have a `bar` property.
 * It's expected that the host application will create the implied necessary object structure.
 *
 * @param assignment - A Viv assignment.
 * @param context - A Viv evaluation context.
 * @returns An object specifying the property to be updated by an assignment, if no eval fail-safe
 *     fired, else the eval fail-safe sentinel.
 * @throws {VivInterpreterError} If the assignment anchor should be an entity but is not.
 * @throws {VivInterpreterError} If a pointer cannot be dereferenced.
 */
async function prepareAssignmentUpdateData(
    assignment: AssignmentValue,
    context: EvaluationContext
): Promise<AssignmentTargetData | typeof EVAL_FAIL_SAFE_SENTINEL> {
    // Prepare our running values that will be recomputed as we walk the path. `entityID` will
    // store the entity ID for the entity whose data will be updated, unless the update pertains
    // to a local variable, in which case it will be `null`. (Note that even if the reference is
    // rooted in a local variable, a pointer along the path may cause us to cross into an entity's
    // data.) Meanwhile, `evaluation` will end up storing the current value stored at the specified
    // property path, which will be `undefined` if the property does not yet exist.
    let entityID: UID | null = null;
    let evaluation: ExpressionValue;
    // Isolate the name of the anchor, which will be either a role name or a local variable name
    const anchorName = assignment.left.value.anchor;
    // Retrieve the anchor data, which will serve as our initial evaluation
    if (isVivExpressionOfType(assignment.left, ExpressionDiscriminator.EntityReference)) {
        const potentialEntityID =
            assignment.left.value.local
                ? context.__locals__[anchorName]
                : context[anchorName];
        if (!isString(potentialEntityID) || !(await GATEWAY.isEntityID(potentialEntityID))) {
            throw createInterpreterError(
                "Cannot execute assignment: anchor is not bound to entity",
                { evaluatedAnchor: potentialEntityID }
            );
        }
        entityID = potentialEntityID;
        evaluation = await GATEWAY.getEntityView(potentialEntityID);
    } else {
        evaluation = context.__locals__[anchorName];
    }
    // Start walking the path
    let propertyPathArray: (string | number)[] = [];  // `number` to allow for array indices
    for (const pathComponent of assignment.left.value.path) {
        switch (pathComponent.type) {
            case ReferencePathComponentDiscriminator.ReferencePathComponentPropertyName:
                propertyPathArray.push(pathComponent.name);
                if (isPlainObject(evaluation)) {
                    evaluation = evaluation[pathComponent.name] as ExpressionValue;
                } else {
                    // If the evaluation is not a plain object, we don't throw an error here, because we need
                    // to support autovivification. That is, we want to allow Viv authors to write assignments
                    // like `@person.foo.bar.baz = 77` even if `@person.foo` does not yet have a `bar` property.
                    // But we do need to set the current evaluation to `undefined` so that we don't carry an
                    // old value forward -- e.g., `@person.foo` in our example here.
                    evaluation = undefined;
                }
                break;
            case ReferencePathComponentDiscriminator.ReferencePathComponentPointer:
                // When we hit a pointer, we need to shift gears to prepare a potential update to *that*
                // entity's data. To do this, we will dereference the pointer, reset `entityID` to the
                // pointer target, and reset `propertyPathArray` to an empty array. Of course, there
                // could be another pointer coming up, in which case we will again reset in this manner.
                // Confirm that the current evaluation is indeed an entity ID
                if (!isString(evaluation) || !(await GATEWAY.isEntityID(evaluation))) {
                    throw createInterpreterError(
                        "Cannot execute assignment: bad pointer on LHS",
                        { pointer: pathComponent }
                    );
                }
                entityID = evaluation as UID;
                propertyPathArray = [pathComponent.propertyName];
                const pointerTargetData = await GATEWAY.getEntityView(entityID);
                evaluation = pointerTargetData[pathComponent.propertyName];
                break;
            case ReferencePathComponentDiscriminator.ReferencePathComponentLookup:
                const evaluatedKey = await interpretExpression(pathComponent.key, context);
                if (evaluatedKey === EVAL_FAIL_SAFE_SENTINEL) {
                    // We allow the author to short-circuit an assignment if any
                    // fail-safe marker in the expression fires.
                    return EVAL_FAIL_SAFE_SENTINEL;
                }
                if (isPlainObject(evaluation)) {
                    if (!isString(evaluatedKey)) {
                        throw createInterpreterError(
                            "Cannot execute assignment: lookup key is not a string",
                            { evaluatedKey }
                        );
                    }
                    evaluation = evaluation[evaluatedKey] as ExpressionValue;
                } else if (isArray(evaluation)) {
                    if (!isValidArrayIndex(evaluatedKey)) {
                        throw createInterpreterError(
                            "Cannot execute assignment: array access index is not a non-negative integer",
                            { evaluatedIndex: evaluatedKey }
                        );
                    }
                    evaluation = evaluation[evaluatedKey] as ExpressionValue;
                } else {
                    // If the evaluation is not a plain object, we don't throw an error here, because we need
                    // to support autovivification. See the note on this topic just above, which also explains
                    // why we need to set the current evaluation to `undefined` here.
                    evaluation = undefined;
                }
                const pathElement = isValidArrayIndex(evaluatedKey) ? evaluatedKey : String(evaluatedKey);
                propertyPathArray.push(pathElement as string | number);
                break;
        }
        // If the current value is nullish, and if the current path component has an attached eval fail-safe
        // marker, let's return the eval fail-safe sentinel now to short-circuit the assignment.
        if (evaluation === undefined || evaluation === null) {
            if (pathComponent.failSafe) {
                return EVAL_FAIL_SAFE_SENTINEL;
            }
        }
    }
    // Package up the update data and return it
    const assignmentTargetData: AssignmentTargetData = {
        localVariable: entityID ? null : anchorName,
        entityID,
        propertyPathArray,
        currentValue: evaluation
    };
    return assignmentTargetData;
}

/**
 * An object specifying the target of an update to be made via an assignment.
 *
 * The update will affect either some entity's data in the host application,
 * or a local variable in the evaluation context at hand.
 */
interface AssignmentTargetData {
    /** If the update is anchored in a local variable, its name, else `null`. */
    localVariable: VariableName | null;
    /** If the update is anchored in an entity ID, the entity ID, else `null`. */
    entityID: string | null;
    /**
     * A path to the particular property of the to be updated, structured as an array of strings
     * and numbers, the latter cuing array accesses. Note that property keys may be arbitrary
     * strings containing e.g. periods or whitespace.
     */
    propertyPathArray: (string | number)[];  // `number` to allow for array indices
    /**
     * The current value stored in the particular property of the data that is to be updated.
     * If the property is being set for the first time, this will be `undefined`.
     */
    currentValue: ExpressionValue;
}

/**
 * Returns the value to assign in an update specified by a Viv assignment.
 *
 * @param assignment - A Viv assignment.
 * @param evaluatedLeft - The evaluation of the left-hand side (LHS) of the assignment.
 * @param evaluatedRight - The evaluation of the right-hand side (RHS) of the assignment.
 * @returns The value to assign.
 */
function deriveUpdateValue(
    assignment: AssignmentValue,
    evaluatedLeft: ExpressionValue,
    evaluatedRight: ExpressionValue
): ExpressionValue {
    let newValue: ExpressionValue;
    switch (assignment.operator) {  // Note: the Viv compiler checks for bad operators
        case AssignmentOperator.Assign:
            newValue = evaluatedRight;
            break;
        case AssignmentOperator.AddAssign:
            if (!isNumber(evaluatedLeft) || !isNumber(evaluatedRight)) {
                throw createInterpreterError(
                    "Cannot execute assignment: non-numeric operand(s) with arithmetic operator",
                    { evaluatedLeft, evaluatedRight }
                );
            }
            newValue = evaluatedLeft + evaluatedRight;
            break;
        case AssignmentOperator.SubtractAssign:
            if (!isNumber(evaluatedLeft) || !isNumber(evaluatedRight)) {
                throw createInterpreterError(
                    "Cannot execute assignment: non-numeric operand(s) with arithmetic operator",
                    { evaluatedLeft, evaluatedRight }
                );
            }
            newValue = evaluatedLeft - evaluatedRight;
            break;
        case AssignmentOperator.MultiplyAssign:
            if (!isNumber(evaluatedLeft) || !isNumber(evaluatedRight)) {
                throw createInterpreterError(
                    "Cannot execute assignment: non-numeric operand(s) with arithmetic operator",
                    { evaluatedLeft, evaluatedRight }
                );
            }
            newValue = evaluatedLeft * evaluatedRight;
            break;
        case AssignmentOperator.DivideAssign:
            if (!isNumber(evaluatedLeft) || !isNumber(evaluatedRight)) {
                throw createInterpreterError(
                    "Cannot execute assignment: non-numeric operand(s) with arithmetic operator",
                    { evaluatedLeft, evaluatedRight }
                );
            }
            if (evaluatedRight === 0) {
                throw createInterpreterError("Cannot execute assignment: division by zero");
            }
            newValue = evaluatedLeft / evaluatedRight;
            break;
        case AssignmentOperator.Append:
            if (!isArray(evaluatedLeft)) {
                throw createInterpreterError(
                    "Cannot execute assignment: non-array LHS with array operator",
                    { evaluatedLeft }
                );
            }
            newValue = [...evaluatedLeft, evaluatedRight];  // Append, not extend
            break;
        case AssignmentOperator.Remove:
            if (!isArray(evaluatedLeft)) {
                throw createInterpreterError(
                    "Cannot execute assignment: non-array LHS with array operator",
                    { evaluatedLeft }
                );
            }
            newValue = removeAll(evaluatedLeft, evaluatedRight);
            break;
        default:
            throw createInterpreterError("Cannot evaluate assignment: unsupported operator");
    }
    // Return the derived update value
    return newValue;
}

/**
 * Executes an inscription event, whereby knowledge of a given action is *inscribed* into a given item.
 *
 * The associated data is updated via an adapter function.
 *
 * Note that we return `true` no matter what, just as we do in {@link executeAssignment}.
 *
 * @param inscription - A Viv inscription.
 * @param context - A Viv evaluation context.
 * @returns `true`.
 * @throws {VivInterpreterError} If the item and action operands do not evaluate to an item and an action respectively.
 */
async function executeInscription(inscription: InscriptionValue, context: EvaluationContext): Promise<true> {
    // Evaluate the operands
    const evaluatedItem = await interpretExpression(inscription.item, context);
    const evaluatedAction = await interpretExpression(inscription.action, context);
    // If either evaluates to the fail-safe sentinel, abort the inscription now
    if (evaluatedItem === EVAL_FAIL_SAFE_SENTINEL || evaluatedAction === EVAL_FAIL_SAFE_SENTINEL) {
        return true;
    }
    // Dehydrate the operands
    const itemID = await dehydrateExpressionValue(evaluatedItem);
    const actionID = await dehydrateExpressionValue(evaluatedAction);
    // Confirm that the dehydrated evaluated operands are indeed entity IDs. If one or both are not
    // entity IDs, we'll throw an error now.
    if (!isString(itemID) || !(await GATEWAY.isEntityID(itemID))) {
        throw createInterpreterError(
            "Cannot execute inscription: item operand is not entity",
            { itemID }
        );
    }
    if (!isString(actionID) || !(await GATEWAY.isEntityID(actionID))) {
        throw createInterpreterError(
            "Cannot execute inscription: action operand is not entity",
            { actionID }
        );
    }
    // Now confirm that they are an item and an action, respectively
    if (!(await isEntityOfType(itemID, EntityType.Item))) {
        throw createInterpreterError(
            "Cannot execute inscription: item operand is not item",
            { itemID, itemType: await GATEWAY.getEntityType(itemID) }
        );
    }
    if (!(await isEntityOfType(actionID, EntityType.Action))) {
        throw createInterpreterError(
            "Cannot execute inscription: action operand is not action",
            { actionID, actionType: await GATEWAY.getEntityType(actionID) }
        );
    }
    // If we get to here, we can safely invoke the knowledge manager to handle the inscription
    await inscribeItem(itemID, actionID);
    // Again, we must return `true` here no matter what
    return true;
}

/**
 * Executes an inspection event, whereby a character inspects an item, thereby learning about
 * all the actions about which it inscribes knowledge.
 *
 * The actual knowledge manipulation is handled by the knowledge manager.
 *
 * Note that we return `true` no matter what, just as we do in {@link executeAssignment}.
 *
 * @param inspection - A Viv inspection.
 * @param context - A Viv evaluation context.
 * @returns `true`.
 * @throws {VivInterpreterError} If the character and item operands do not evaluate to a character
 *     and an item respectively.
 */
async function executeInspection(inspection: InspectionValue, context: EvaluationContext): Promise<true> {
    // Evaluate the operands
    const evaluatedCharacter = await interpretExpression(inspection.character, context);
    const evaluatedItem = await interpretExpression(inspection.item, context);
    // If either evaluates to the fail-safe sentinel, abort the inscription now
    if (evaluatedCharacter === EVAL_FAIL_SAFE_SENTINEL || evaluatedItem === EVAL_FAIL_SAFE_SENTINEL) {
        return true;
    }
    // Dehydrate the operands
    const characterID = await dehydrateExpressionValue(evaluatedCharacter);
    const itemID = await dehydrateExpressionValue(evaluatedItem);
    // Confirm that the dehydrated evaluated operands are indeed entity IDs. If one or both are not
    // entity IDs, we'll throw an error now.
    if (!isString(characterID) || !(await GATEWAY.isEntityID(characterID))) {
        throw createInterpreterError(
            "Cannot execute inspection: character operand is not entity",
            { characterID }
        );
    }
    if (!isString(itemID) || !(await GATEWAY.isEntityID(itemID))) {
        throw createInterpreterError(
            "Cannot execute inspection: item operand is not entity",
            { itemID }
        );
    }
    // Now confirm that they are an item and an action, respectively
    if (!(await isEntityOfType(characterID, EntityType.Character))) {
        throw createInterpreterError(
            "Cannot execute inspection: character operand is not character",
            { characterID, characterType: await GATEWAY.getEntityType(characterID) }
        );
    }
    if (!(await isEntityOfType(itemID, EntityType.Item))) {
        throw createInterpreterError(
            "Cannot execute inspection: item operand is not item",
            { itemID, itemType: await GATEWAY.getEntityType(itemID) }
        );
    }
    // If we get to here, we can safely execute the inspection event. This requires the entity
    // ID for the action that instigated this inspection, which is always the one at hand,
    // whose ID is always available as the binding for the `this` special role.
    const inspectionActionID = context.this as UID;
    await inspectItem(characterID, itemID, inspectionActionID);
    // Again, we must return `true` here no matter what
    return true;
}

/**
 * Returns a {@link VivInterpreterError} prepared for the context at hand.
 *
 * The error prepared here will be included in an API payload upon any interpreter issue.
 *
 * We use a factory pattern here to centralize access to the module-level variables {@link CURRENT_EXPRESSION}
 * and {@link CURRENT_EVALUATION_CONTEXT}, whose values are always incorporated into a `VivInterpreterError`.
 *
 * @param msg - A human-readable summary of the failure.
 * @param extraContext - If applicable, an object containing additional context, such as the evaluations
 *     of certain fields or intermediate concerns. When present, this is inserted into the error context.
 * @param externalCause - If applicable, an exception that caused the interpreter failure that is external
 *     in origin, due to originating in a call to a custom function exposed in the host-application adapter.
 * @returns {@link VivInterpreterError}
 */
function createInterpreterError(
    msg: string,
    extraContext: Record<string, unknown> | null = null,
    externalCause?: unknown,
): VivInterpreterError {
    return new VivInterpreterError(
        msg,
        CURRENT_EXPRESSION,
        CURRENT_EVALUATION_CONTEXT,
        extraContext || undefined,
        externalCause
    );
}

/**
 * The last expression that the Viv interpreter attempted to evaluate before either
 * encountering an issue or completing evaluation.
 *
 * This will be inserted in error reporting, as applicable, via {@link createInterpreterError}.
 */
let CURRENT_EXPRESSION: Expression;

/**
 * The evaluation context at the time that the Viv interpreter attempted to evaluate the last
 * expression before either encountering an issue or completing evaluation.
 *
 * This will be inserted in error reporting, as applicable, via {@link createInterpreterError}.
 */
let CURRENT_EVALUATION_CONTEXT: EvaluationContext;
