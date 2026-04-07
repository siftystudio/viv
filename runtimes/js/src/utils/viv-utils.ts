import type { ActionView, CharacterView, DiegeticTimestamp, EntityView, TimeOfDay, UID } from "../adapter/types";
import type {
    ActionDefinition,
    ActionName,
    ActionSelectorDefinition,
    ConstructDefinition,
    ConstructName,
    PlanDefinition,
    PlanName,
    PlanSelectorDefinition,
    QueryDefinition,
    QueryName,
    RoleDefinition,
    RoleName,
    SelectorName,
    SiftingPatternDefinition,
    SiftingPatternName,
    TropeDefinition,
    TropeName
} from "../content-bundle/types";
import type { TimeDelta } from "../dsl/types";
import type { ExpressionValue } from "../interpreter/types";
import { EntityType } from "../adapter";
import { ConstructDiscriminator, CONTENT_BUNDLE } from "../content-bundle";
import { TimeFrameTimeUnit } from "../dsl";
import { VivExecutionError, VivInternalError } from "../errors";
import { GATEWAY } from "../gateway";
import { isPlainObject, isString } from "./general-utils";

/**
 * Returns the definition for the construct of the given type with the given name.
 *
 * @param constructType - The type of construct whose definition is to be furnished.
 * @param constructName - The name of the construct whose definition is to be furnished.
 * @returns The requested construct definition.
 * @throws {VivInternalError} If `constructType` is invalid (defensive guard).
 * @throws {VivExecutionError} If there is no such defined construct in the content bundle.
 */
export function getConstructDefinition(
    constructType: ConstructDiscriminator,
    constructName: ConstructName
): ConstructDefinition {
    let constructDefinition: ConstructDefinition | undefined;
    switch (constructType) {
        case ConstructDiscriminator.Action:
            constructDefinition = CONTENT_BUNDLE.actions[constructName];
            break;
        case ConstructDiscriminator.ActionSelector:
            constructDefinition = CONTENT_BUNDLE.actionSelectors[constructName];
            break;
        case ConstructDiscriminator.Plan:
            constructDefinition = CONTENT_BUNDLE.plans[constructName];
            break;
        case ConstructDiscriminator.PlanSelector:
            constructDefinition = CONTENT_BUNDLE.planSelectors[constructName];
            break;
        case ConstructDiscriminator.Query:
            constructDefinition = CONTENT_BUNDLE.queries[constructName];
            break;
        case ConstructDiscriminator.SiftingPattern:
            constructDefinition = CONTENT_BUNDLE.siftingPatterns[constructName];
            break;
        case ConstructDiscriminator.Trope:
            constructDefinition = CONTENT_BUNDLE.tropes[constructName];
            break;
        default:
            throw new VivInternalError(`Invalid construct type: '${constructType}'`);
    }
    if (!constructDefinition) {
        throw new VivExecutionError(
            `Cannot retrieve ${constructType} '${constructName}' (no such defined construct)`
        );
    }
    return constructDefinition;
}

/**
 * Returns the definition for the action with the given name.
 *
 * @param actionName - The name of the action whose definition is to be furnished.
 * @returns The definition for the action with the given name.
 * @throws {VivExecutionError} If there is no defined action by the given name in the content bundle.
 */
export function getActionDefinition(actionName: ActionName): ActionDefinition {
    const actionDefinition = CONTENT_BUNDLE.actions[actionName];
    if (!actionDefinition) {
        throw new VivExecutionError(`Cannot retrieve action with name '${actionName}' (no such defined action)`);
    }
    return actionDefinition;
}

/**
 * Returns the definition for the action selector with the given name.
 *
 * @param actionSelectorName - The name of the action selector whose definition is to be furnished.
 * @returns The definition for the action selector with the given name.
 * @throws {VivExecutionError} If there is no defined action selector by the given name in the content bundle.
 */
export function getActionSelectorDefinition(
    actionSelectorName: SelectorName
): ActionSelectorDefinition {
    const actionSelectorDefinition = CONTENT_BUNDLE.actionSelectors[actionSelectorName];
    if (!actionSelectorDefinition) {
        throw new VivExecutionError(
            `Cannot retrieve action selector with name '${actionSelectorName}' (no such defined action selector)`
        );
    }
    return actionSelectorDefinition;
}

/**
 * Returns the definition for the plan with the given name.
 *
 * @param planName - The name of the plan whose definition is to be furnished.
 * @returns The definition for the plan with the given name.
 * @throws {VivExecutionError} If there is no defined plan by the given name in the content bundle.
 */
export function getPlanDefinition(planName: PlanName): PlanDefinition {
    const planDefinition = CONTENT_BUNDLE.plans[planName];
    if (!planDefinition) {
        throw new VivExecutionError(`Cannot retrieve plan with name '${planName}' (no such defined plan)`);
    }
    return planDefinition;
}

/**
 * Returns the definition for the plan selector with the given name.
 *
 * @param planSelectorName - The name of the plan selector whose definition is to be furnished.
 * @returns The definition for the plan selector with the given name.
 * @throws {VivExecutionError} If there is no defined plan selector by the given name in the content bundle.
 */
export function getPlanSelectorDefinition(
    planSelectorName: SelectorName
): PlanSelectorDefinition {
    const planSelectorDefinition = CONTENT_BUNDLE.planSelectors[planSelectorName];
    if (!planSelectorDefinition) {
        throw new VivExecutionError(
            `Cannot retrieve plan selector with name '${planSelectorName}' (no such defined plan selector)`
        );
    }
    return planSelectorDefinition;
}

/**
 * Returns the definition for the query with the given name.
 *
 * @param queryName - The name of the query whose definition is to be furnished.
 * @returns The definition for the query with the given name.
 * @throws {VivExecutionError} If there is no defined query by the given name in the content bundle.
 */
export function getQueryDefinition(queryName: QueryName): QueryDefinition {
    const queryDefinition = CONTENT_BUNDLE.queries[queryName];
    if (!queryDefinition) {
        throw new VivExecutionError(`Cannot retrieve query with name '${queryName}' (no such defined query)`);
    }
    return queryDefinition;
}

/**
 * Returns the definition for the sifting pattern with the given name.
 *
 * @param siftingPatternName - The name of the sifting pattern whose definition is to be furnished.
 * @returns The definition for the sifting pattern with the given name.
 * @throws {VivExecutionError} If there is no defined sifting pattern by the given name in the content bundle.
 */
export function getSiftingPatternDefinition(
    siftingPatternName: SiftingPatternName
): SiftingPatternDefinition {
    const siftingPatternDefinition = CONTENT_BUNDLE.siftingPatterns[siftingPatternName];
    if (!siftingPatternDefinition) {
        throw new VivExecutionError(
            `Cannot retrieve sifting pattern with name '${siftingPatternName}' (no such defined pattern)`
        );
    }
    return siftingPatternDefinition;
}

/**
 * Returns the definition for the trope with the given name.
 *
 * @param tropeName - The name of the trope whose definition is to be furnished.
 * @returns The definition for the trope with the given name.
 * @throws {VivExecutionError} If there is no defined trope by the given name in the content bundle.
 */
export function getTropeDefinition(tropeName: TropeName): TropeDefinition {
    const tropeDefinition = CONTENT_BUNDLE.tropes[tropeName];
    if (!tropeDefinition) {
        throw new VivExecutionError(`Cannot retrieve trope with name '${tropeName}' (no such defined trope)`);
    }
    return tropeDefinition;
}

/**
 * Returns the definition for the role with the given name in the given construct definition.
 *
 * @param constructDefinition - The definition for the construct (action, trope, etc.) with which
 *     the role in question is associated.
 * @param roleName - The name of the role whose definition is to be furnished.
 * @returns The definition for the role with the given name in the given construct definition.
 * @throws {VivExecutionError} If there is no role by the given name in the given construct definition.
 */
export function getRoleDefinition(
    constructDefinition: ConstructDefinition,
    roleName: RoleName
): RoleDefinition {
    const roleDefinition = constructDefinition.roles[roleName];
    if (!roleDefinition) {
        throw new VivExecutionError(
            `Cannot retrieve role '${roleName}' on ${constructDefinition.type} `
            + `'${constructDefinition.name}' (no such defined role)`
        );
    }
    return roleDefinition;
}

/**
 * Fetches the character view for the given character.
 *
 * @param characterID - Entity ID for the character whose character view is to be returned.
 * @returns The requested character view, narrowed to the {@link CharacterView} type.
 */
export async function getCharacterData(characterID: UID): Promise<CharacterView> {
    return await getEntityViewOfType<CharacterView>(characterID, EntityType.Character);
}

/**
 * Fetches an action view for the given action.
 *
 * @param actionID - Entity ID for the action whose action view is to be returned.
 * @returns The requested action view, narrowed to the {@link ActionView} type.
 */
export async function getActionView(actionID: UID): Promise<ActionView> {
    return await getEntityViewOfType<ActionView>(actionID, EntityType.Action);
}

/**
 * Returns whether the entity with the given entity ID has the given entity type.
 *
 * @param entityID - Entity ID whose type will be checked.
 * @param entityType - Entity type to check.
 * @returns Whether the entity with the given entity ID has the given entity type.
 */
export async function isEntityOfType(
    entityID: UID,
    entityType: EntityType
): Promise<boolean> {
    return (await GATEWAY.getEntityType(entityID)) === entityType;
}

/**
 * Helper function that fetches the entity view for the given entity, asserting that it
 * matches the specified entity type.
 *
 * This function wraps {@link HostApplicationAdapter.getEntityView}, but also serves as a type guard
 * enforcing that the retrieved entity is of the expected type. If the type does not match, an error
 * will be thrown. When the type check passes, the return type will be narrowed accordingly.
 *
 * @typeParam T - The entity type expected for the entity whose entity view is to be returned.
 * @param entityID - Entity ID for the entity whose entity view is to be returned.
 * @param expectedType - The {@link EntityType} discriminator expected for the entity.
 * @returns The requested entity view, narrowed to the expected type.
 * @throws {VivExecutionError} If the retrieved entity does not have the expected entity type.
 */
async function getEntityViewOfType<T extends EntityView>(entityID: UID, expectedType: T["entityType"]): Promise<T> {
    const data = await GATEWAY.getEntityView(entityID);
    if (data.entityType !== expectedType) {
        throw new VivExecutionError(
            `Expected entity with ID '${entityID}' to be of type '${expectedType}', but got '${data.entityType}'`
        );
    }
    return data as T;
}

/**
 * Returns a grounded timestamp, in story time, by adding to the current timestamp the given amount of time.
 *
 * @param anchorTimestamp - A {@link DiegeticTimestamp} on which the grounding
 *     procedure will be anchored.
 * @param delta - The (unsigned) time delta that will be applied to the anchor timestamp.
 * @param inPast - Whether the desired point in time *precedes* the anchor timestamp.
 * @returns A grounded {@link DiegeticTimestamp}.
 */
export function groundRelativePointInTime(
    anchorTimestamp: DiegeticTimestamp,
    delta: TimeDelta,
    inPast = false
): DiegeticTimestamp {
    let deltaInMinutes: number;
    switch (delta.unit) {
        case TimeFrameTimeUnit.Minutes:
            deltaInMinutes = delta.amount;
            break;
        case TimeFrameTimeUnit.Hours:
            deltaInMinutes = delta.amount * 60;
            break;
        case TimeFrameTimeUnit.Days:
            deltaInMinutes = delta.amount * 60 * 24;
            break;
        case TimeFrameTimeUnit.Weeks:
            deltaInMinutes = delta.amount * 60 * 24 * 7;
            break;
        case TimeFrameTimeUnit.Months:
            deltaInMinutes = delta.amount * 60 * 24 * 30;
            break;
        case TimeFrameTimeUnit.Years:
            deltaInMinutes = delta.amount * 60 * 24 * 365;
            break;
    }
    return inPast ? anchorTimestamp - deltaInMinutes : anchorTimestamp + deltaInMinutes;
}

/**
 * Returns whether the given time of day is at or after the given time-of-day threshold.
 *
 * Note that this function returns `true` if `time` is exactly `threshold`.
 *
 * @param time - The time of day being tested.
 * @param threshold - The reference time of day against which we will compare the time of day in question.
 * @returns Whether `time` is at or after `threshold`.
 */
export function timeOfDayIsAtOrAfter(time: TimeOfDay, threshold: TimeOfDay): boolean {
    if (time.hour > threshold.hour) {
        return true;
    }
    if (time.hour < threshold.hour) {
        return false;
    }
    return time.minute >= threshold.minute;
}

/**
 * If the given value looks like an entity view, it returns the associated entity ID, otherwise the original
 * value is returned. Among other purposes, this enables easy comparison between entities, without the
 * Viv author having to worry about whether they're comparing entity IDs or entity views.
 *
 * @param expressionValue - A value produced by the Viv interpreter evaluating a Viv expression.
 * @returns If the value appears to be an entity view, the entity ID, else the value itself.
 */
export function dehydrateEntityReference(expressionValue: ExpressionValue): ExpressionValue {
    if (isEntityView(expressionValue)) {
        return expressionValue.id;
    }
    return expressionValue;
}

/**
 * If the given value looks is an entity ID, it returns the associated entity view,
 * otherwise the original value is returned.
 *
 * @param expressionValue - A value produced by the Viv interpreter evaluating a Viv expression.
 * @returns If the value is an entity ID, the entity view, else the value itself.
 */
export async function hydrateEntityReference(expressionValue: ExpressionValue): Promise<ExpressionValue> {
    if (isString(expressionValue) && await GATEWAY.isEntityID(expressionValue)) {
        return await GATEWAY.getEntityView(expressionValue);
    }
    return expressionValue;
}

/**
 * A type guard that returns whether the given expression matches the shape required for entity data.
 *
 * The robust approach here would be to invoke {@link isEntityID}, but that's an expensive async
 * call and this is a very hot path, since we constantly call this function when determining whether
 * to dehydrate an object.
 *
 * Instead, we'll implement a fast heuristic: if the object has both an `entityType` property
 * and an `id` property, it's almost certainly a Viv entity.
 *
 * @param expressionValue - A value produced by the Viv interpreter evaluating a Viv expression.
 * @returns Whether the value is a plain object with both an `entityType` property and an `id` property of type `"string"`.
 */
export function isEntityView(expressionValue: unknown): expressionValue is EntityView {
    if (isPlainObject(expressionValue)) {
        if ("entityType" in expressionValue && "id" in expressionValue) {
            if (isString(expressionValue.id)) {
                return true;
            }
        }
    }
    return false;
}
