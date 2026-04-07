import type { ActionView } from "../adapter/types";
import type { ConstructDefinition, ConstructName } from "../content-bundle/types";
import type { Expression } from "../dsl/types";
import type { RoleBindings } from "../role-caster/types";
import type { EvaluationContext, ExpressionValue } from "./types";
import { EntityType } from "../adapter";
import { ConstructDiscriminator } from "../content-bundle";
import { EXPRESSION_DISCRIMINATORS, ExpressionDiscriminator } from "../dsl";
import { GATEWAY } from "../gateway";
import { getCanonicalRoleCandidatesKey } from "../role-caster";
import {
    dehydrateEntityReference,
    getConstructDefinition,
    isArray,
    isEntityView,
    isPlainObject
} from "../utils";
import { EVAL_FAIL_SAFE_SENTINEL } from "./constants";

/**
 * Returns a newly prepared Viv evaluation context.
 *
 * @param targetConstructType - The type of the construct being targeted (used for debugging).
 * @param targetConstructName - The name of the construct being targeted (used for debugging).
 * @returns A newly prepared Viv evaluation context.
 */
export function prepareEvaluationContext(
    targetConstructType: ConstructDiscriminator,
    targetConstructName: ConstructName,
): EvaluationContext {
    const evaluationContext: EvaluationContext = {
        __groups__: {},
        __locals__: {},
        __constructType__: targetConstructType,
        __constructName__: targetConstructName,
    }
    const constructDefinition = getConstructDefinition(targetConstructType, targetConstructName);
    for (const roleDefinition of Object.values(constructDefinition.roles)) {
        if (roleDefinition.max > 1) {  // Note: Optional singleton roles (min=0, max=1) do not go in `__groups__`
            evaluationContext.__groups__[roleDefinition.name] = [];
        }
    }
    return evaluationContext;
}

/**
 * Returns a newly prepared dummy Viv evaluation context.
 *
 * A dummy evaluation context is needed when the Viv interpreter is to be invoked to
 * evaluate expressions that do not actually require entity data to be evaluated.
 *
 * @returns A newly prepared dummy Viv evaluation context.
 */
export function prepareDummyEvaluationContext(): EvaluationContext {
    const evaluationContext: EvaluationContext = {
        __groups__: {},
        __locals__: {},
    };
    return evaluationContext;
}

/**
 * Returns a Viv evaluation context derived from the given (partial) bindings.
 *
 * @param constructDefinition - Definition for the construct that is being targeted.
 * @param bindings - Current (partial) bindings at this point in action targeting.
 * @returns A Viv evaluation context derived from the given (partial) bindings.
 */
export function getEvaluationContextFromBindings(
    constructDefinition: ConstructDefinition,
    bindings: RoleBindings
): EvaluationContext {
    // Start with the minimal shape of an evaluation context
    const evaluationContext = prepareEvaluationContext(constructDefinition.type, constructDefinition.name);
    // Populate the evaluation context
    for (const roleName in constructDefinition.roles) {
        const roleDefinition = constructDefinition.roles[roleName];
        const roleBindings = bindings[roleName] ?? [];
        if (roleDefinition.max > 1) {
            // If this is a group role, meaning one that does not always cast exactly one candidate, we need
            // to populate the corresponding `__groups__` subfield. This is needed to evaluate references to
            // the group role. Note that we want empty arrays for all optional group roles wit no bindings,
            // since it's often convenient to loop over an optional group role without having to check first
            // if there are any bindings.
            evaluationContext.__groups__[roleName] = [...roleBindings].sort(
                (a, b) => (
                    getCanonicalRoleCandidatesKey(a).localeCompare(getCanonicalRoleCandidatesKey(b))
                )
            );
        } else if (roleBindings?.length) {
            // If it's a bound singleton role, we map directly to the candidate cast in the role
            const candidate = roleBindings[0];
            evaluationContext[roleName] = candidate;
        }
    }
    // Return the prepared evaluation context
    return evaluationContext;
}

/**
 * Dehydrates the given evaluation context by converting any (potentially nested) entity data to entity IDs.
 *
 * This function is currently used to derive an evaluation context for the abandonment conditions of
 * a queued action produced by a reaction declaration. We need to do this so that we rehydrate entity
 * references at the time of evaluating the abandonment conditions, at which point entity data may have
 * of course changed since the action was first queued at the time of evaluating a reaction declaration.
 *
 * Note that the function creates a new object in lieu of mutating the existing context in any way.
 *
 * @param context - The Viv evaluation context to dehydrate.
 * @returns A Viv evaluation context where all entity data instances have been dehydrated to entity IDs.
 */
export async function dehydrateEvaluationContext(context: EvaluationContext): Promise<EvaluationContext> {
    const dehydratedContext: Record<string, ExpressionValue> = {};
    for (const key in context) {
        dehydratedContext[key] = await dehydrateExpressionValue(context[key]);
    }
    return dehydratedContext as EvaluationContext;
}

/**
 * Dehydrates the given Viv expression value by traversing it recursively to convert
 * any (potentially nested) entity data into entity IDs.
 *
 * Note that the function creates new values in lieu of mutating any existing ones in any way.
 *
 * @param value - The value to recursively dehydrate.
 */
export async function dehydrateExpressionValue(value: ExpressionValue): Promise<ExpressionValue> {
    // If it's entity data, convert to an entity ID
    if (isEntityView(value)) {
        if (await GATEWAY.isEntityID(value.id)) {
            return dehydrateEntityReference(value);
        }
    }
    // If it's an array, recurse into each element of the array
    if (isArray(value)) {
        const dehydratedValue: ExpressionValue[] = [];
        for (const element of (value as ExpressionValue[])) {
            dehydratedValue.push(await dehydrateExpressionValue(element));
        }
        return dehydratedValue;
    }
    // If it's a plain object, recurse into each property to exhaustively dehydrate the object
    if (isPlainObject(value)) {
        const dehydratedValue: Record<string, ExpressionValue> = {};
        for (const key in value) {
            dehydratedValue[key] = await dehydrateExpressionValue(value[key] as ExpressionValue);
        }
        return dehydratedValue;
    }
    // If we get to here, this is a simple value (likely an entity ID) that can be returned as-is
    return value;
}

/**
 * Returns whether the given value is truthy.
 *
 * This utility function is implemented so that we can properly handle treating
 * eval fail-safe sentinels as booleans, and empty arrays and objects as falsy.
 *
 * @param value - The value to convert to a boolean.
 */
export function isTruthy(value: ExpressionValue): boolean {
    // Handle conversion of the eval fail-safe sentinel, which requires special casing due to
    // it being of type `symbol` -- this makes it truthy by default, when in fact it's falsy
    // in the Viv semantics.
    if (value === EVAL_FAIL_SAFE_SENTINEL) {
        return false;
    }
    if (isArray(value) && !value.length) {
        return false;
    }
    if (isPlainObject(value) && !Object.keys(value).length) {
        return false;
    }
    return !!value;
}

/**
 * Returns whether the given value appears to be a Viv expression (of any supported type).
 *
 * This function also acts as a type guard: if `true` is returned, the caller can
 * safely treat the given value as a Viv expression.
 *
 * @param value - The value whose status as a Viv expression will be tested.
 * @returns Whether the given value is an object with a `type` property storing a valid Viv expression discriminator.
 */
export function isVivExpression(value: unknown): value is Expression {
    if (!isPlainObject(value)) {
        return false;
    }
    if (!("type" in value)) {
        return false;
    }
    return EXPRESSION_DISCRIMINATORS.includes((value as any).type);
}

/**
 * Returns whether the given value appears to be a Viv expression of the given type.
 *
 * This function also acts as a type guard: if `true` is returned, the caller can
 * safely treat the given value as an expression of the given type.
 *
 * @typeParam K - The specific expression type to test for.
 * @param value - The value whose status is to be tested.
 * @param expressionType - The expression type to be used for the test.
 * @returns Whether the given value has a `type` property storing `expressionType`.
 */
export function isVivExpressionOfType<K extends ExpressionDiscriminator>(
    value: unknown,
    expressionType: K
): value is Extract<Expression, { type: K }> {
    return value != null && typeof value === "object" && (value as any).type === expressionType;
}

/**
 * Returns whether the given value appears be action data.
 */
export function isActionView(value: unknown): value is ActionView {
    if (!isEntityView(value)) {
        return false;
    }
    return value.entityType === EntityType.Action;
}

/**
 * Returns whether the given value is a valid array index (non-negative integer).
 *
 * @param value - The value whose status as a valid array index will be tested.
 * @returns Whether the value is a valid array index (non-negative integer).
 */
export function isValidArrayIndex(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
