import type { ActionView, UID } from "../adapter/types";
import type { EvaluationContext } from "../interpreter/types";
import type { RoleBindings } from "../role-caster/types";
import type { RoleName } from "../content-bundle/types";
import { SpecialRoleName } from "../action-manager";
import { GATEWAY } from "../gateway";
import { VivExecutionError } from "../errors";
import { interpretExpression } from "../interpreter";
import { clone, deduplicate, getActionDefinition, isArrayOf, isNumber, isString } from "../utils";

/**
 * Returns the role name for the given entity in the given bindings, if any.
 *
 * @param bindings - The role bindings to search.
 * @param entityID - The entity ID to look up.
 * @returns The role name the entity is bound to, or `undefined` if the entity is not in any role.
 */
function getRoleForEntity(bindings: RoleBindings, entityID: UID): RoleName | undefined {
    for (const [roleName, candidates] of Object.entries(bindings)) {
        if (candidates.includes(entityID)) {
            return roleName as RoleName;
        }
    }
    return undefined;
}

/**
 * Returns a numeric salience increment for the given character, with regard to the given action.
 *
 * If the character is learning about this action for the first time, the increment will serve as
 * an initial salience value for that character's memory of it. If the action is being considered
 * in a post-hoc manner, meaning (long) after it was originally performed, the increment here will
 * be added to the character's running salience value. This supports the phenomenon where memory of
 * event fades as time passes without it being considered, whereas the salience of an event increases
 * every time it's reconsidered.
 *
 * Note: Any negative salience increment will be clamped to `0.0`.
 *
 * @param characterID - Entity ID for the character for whom the salience increment is being computed.
 * @param actionView - Action view for the action under consideration.
 * @param context - A Viv evaluation context.
 * @param postHoc - Whether we're computing a salience increment for an action that was already performed,
 *     potentially long ago, in which case we'll cast the given character in the special `hearer` role.
 * @returns A numeric salience increment for the given character, with regard to the given action.
 * @throws {VivExecutionError} If a per-role salience expression evaluates to a non-numeric value.
 * @throws {VivExecutionError} If the default salience expression evaluates to a non-numeric value.
 */
export async function computeSalienceIncrement(
    characterID: UID,
    actionView: ActionView,
    context: EvaluationContext,
    postHoc = false
): Promise<number> {
    // Retrieve the action definition and prepare an evaluation context
    const actionDefinition = getActionDefinition(actionView.name);
    // Clone the evaluation context, so that we can scope the saliences variable to this
    // computation only, and likewise with the hearer role if knowledge is being relayed.
    context = clone<EvaluationContext>(context);
    if (postHoc) {
        context[SpecialRoleName.Hearer] = characterID;
    }
    // Time to compute the salience increment. First, let's check if they have an applicable per-role
    // salience-yielding expression. If they do, we'll use it to derive the salience increment.
    const salienceRoleName = getRoleForEntity(actionView.bindings, characterID);
    if (salienceRoleName) {
        if (actionDefinition.saliences.roles[salienceRoleName]) {
            const perRoleSalienceExpression = actionDefinition.saliences.roles[salienceRoleName];
            const result = await interpretExpression(perRoleSalienceExpression, context);
            if (!isNumber(result)) {
                const errorMessage = (
                    `Per-role salience expression for role '${salienceRoleName}' in action `
                    + `'${actionDefinition.name}' evaluated to a non-numeric value`
                );
                throw new VivExecutionError(
                    errorMessage,
                    { expression: perRoleSalienceExpression, result }
                );
            }
            return Math.max(result, 0.0);
        }
    }
    // Otherwise, we'll try evaluating the custom salience-yielding expressions, with the character at hand
    // bound to the associated local variable. Specifically, we will evaluate these in order, one at a time.
    // If the result of any such evaluation is numeric, we will use that as the salience increment.
    if (actionDefinition.saliences.variable) {
        context.__locals__[actionDefinition.saliences.variable.name] = characterID;
    }
    let salienceIncrement: number | undefined;
    for (const salienceExpression of actionDefinition.saliences.custom) {
        const result = await interpretExpression(salienceExpression, context);
        if (isNumber(result)) {
            salienceIncrement = result;
            break;
        }
    }
    // If there are no custom saliences expressions, or if none of them evaluate to a
    // numeric value, we'll evaluate the saliences default expression instead.
    if (salienceIncrement === undefined) {
        const result = await interpretExpression(actionDefinition.saliences.default, context);
        if (!isNumber(result)) {
            throw new VivExecutionError(
                `Default salience in action '${actionDefinition.name}' evaluated to a non-numeric value`,
                { expression: actionDefinition.saliences.default, result }
            );
        }
        salienceIncrement = result;
    }
    return Math.max(salienceIncrement, 0.0);
}

/**
 * Returns an array of subjective associations for the given character, with regard to the given action.
 *
 * Note: the result will be deduplicated prior to being returned.
 *
 * @param characterID - Entity ID for the character for whom subjective associations are being computed.
 * @param actionView - Action view for the action under consideration.
 * @param context - A Viv evaluation context.
 * @param postHoc - Whether we're computing (new) associations for an action that was already performed,
 *     potentially long ago, in which case we'll cast the given character in the special `hearer` role.
 * @throws {VivExecutionError} If a per-role associations expression does not evaluate to a string array.
 * @throws {VivExecutionError} If the default associations expression does not evaluate to a string array.
 * @returns An array of subjective associations for the given character, with regard to the given action.
 */
export async function computeAssociations(
    characterID: UID,
    actionView: ActionView,
    context: EvaluationContext,
    postHoc = false
): Promise<string[]> {
    // Retrieve the action definition and prepare an evaluation context
    const actionDefinition = getActionDefinition(actionView.name);
    // Clone the evaluation context, so that we can scope the associations variable to this
    // computation only, and likewise with the hearer role if knowledge is being relayed.
    context = clone<EvaluationContext>(context);
    if (postHoc) {
        context[SpecialRoleName.Hearer] = characterID;
    }
    // Time to compute the associations. First, let's check if they have an applicable per-role
    // associations-yielding expression. If they do, we'll use it to derive the associations.
    const associationsRoleName = getRoleForEntity(actionView.bindings, characterID);
    if (associationsRoleName) {
        if (actionDefinition.associations.roles[associationsRoleName]) {
            const perRoleAssociationsExpression = actionDefinition.associations.roles[associationsRoleName];
            const result = await interpretExpression(perRoleAssociationsExpression, context);
            if (!isArrayOf<string>(result, isString)) {
                const errorMessage = (
                    `Per-role associations expression for role '${associationsRoleName}' in action `
                    + `'${actionDefinition.name}' did not evaluate to a string array`
                );
                throw new VivExecutionError(
                    errorMessage,
                    { expression: perRoleAssociationsExpression, result }
                );
            }
            return result;
        }
    }
    // Otherwise, we'll try evaluating the custom associations-yielding expressions, with the character at hand
    // bound to the associated local variable. Specifically, we will evaluate these in order, one at a time.
    // If the result of any such evaluation is a string array, we will use that as the new associations.
    if (actionDefinition.associations.variable) {
        context.__locals__[actionDefinition.associations.variable.name] = characterID;
    }
    let associations: string[] = [];
    for (const associationsExpression of actionDefinition.associations.custom) {
        const result = await interpretExpression(associationsExpression, context, true);
        if (isArrayOf<string>(result, isString)) {
            associations = result;
            break;
        }
    }
    // If there are no associations expressions, or if none of them evaluate to a string array containing
    // at least one string, we'll evaluate the associations default expression instead.
    if (!associations.length) {
        const result = await interpretExpression(
            actionDefinition.associations.default,
            context,
            true
        );
        if (!isArrayOf<string>(result, isString)) {
            throw new VivExecutionError(
                `Default associations in action '${actionDefinition.name}' did not evaluate to a string array`,
                { expression: actionDefinition.associations.default, result }
            );
        }
        associations = result;
    }
    // Finally, deduplicate and return the result
    return deduplicate<string>(associations);
}

/**
 * Clamps the given salience value so that it does not exceed a configured threshold.
 *
 * @param salienceValue The salience value to clamp.
 * @return The clamped salience value.
 */
export function clampSalience(salienceValue: number): number {
    if (!GATEWAY.config.memoryMaxSalience) {
        return salienceValue;
    }
    return Math.min(salienceValue, GATEWAY.config.memoryMaxSalience);
}
