import type { Expression } from "../dsl/types";
import type { ConstructDefinition, RoleName } from "../content-bundle/types";
import type { ActionTargetingEvent, PlanExecutionEvent, WatchedConstructDebuggingState } from "./types";
import { ConstructDiscriminator } from "../content-bundle";
import { GATEWAY } from "../gateway";
import { VivInternalError } from "../errors";
import { RoleCastingBacktrackReason } from "./constants";

/**
 * If applicable, records an attempt to target the given construct.
 *
 * This operation only applies if the given construct is on a debugging watchlist.
 *
 * @param constructDefinition - Definition for the construct for which a targeting attempt will be recorded.
 * @returns Nothing. The targeting attempt is recorded via side effects.
 */
export async function recordTargetingAttempt(constructDefinition: ConstructDefinition): Promise<void> {
    await updateWatchedConstructState(
        constructDefinition,
        watchedConstructState => { watchedConstructState.targetingAttempts++; }
    );
}

/**
 * If applicable, records the given reason for backtracking during an instance of role casting.
 *
 * This operation only applies if the given construct is on a debugging watchlist.
 *
 * @param constructDefinition - Definition for the construct associated with the role
 *     for which a casting attempt is being recorded.
 * @param roleName - Name of the role for which a casting attempt is being recorded.
 * @returns Nothing. The casting attempt is recorded via side effects.
 */
export async function recordCastingAttempt(
    constructDefinition: ConstructDefinition,
    roleName: RoleName
): Promise<void> {
    await updateWatchedConstructState(
        constructDefinition,
        watchedConstructState => {
            watchedConstructState.castingAttempts[roleName] ??= 0;
            watchedConstructState.castingAttempts[roleName]++;
        }
    );
}

/**
 * If applicable, records the given reason for backtracking during an instance of role casting.
 *
 * This operation only applies if the given construct is on a debugging watchlist.
 *
 * @param constructDefinition - Definition for the construct for which backtracking has occurred during role casting.
 * @param roleName - Name of the role that was being cast when backtracking occurred.
 * @param reason - One of the possible reasons for backtracking during role casting.
 * @returns Nothing. The backtracking reason is recorded via side effects.
 */
export async function recordBacktrackingReason(
    constructDefinition: ConstructDefinition,
    roleName: RoleName | null,
    reason: RoleCastingBacktrackReason
): Promise<void> {
    await updateWatchedConstructState(
        constructDefinition,
        watchedConstructState => {
            roleName = roleName ?? "global"
            watchedConstructState.backtrackingReasons[roleName] ??= {};
            watchedConstructState.backtrackingReasons[roleName][reason] ??= 0;
            watchedConstructState.backtrackingReasons[roleName][reason]++;
        }
    );
}

/**
 * If applicable, records the given result of the testing the given condition.
 *
 * This operation only applies if the given construct is on a debugging watchlist.
 *
 * @param constructDefinition - Definition for the construct associated with the given condition.
 * @param condition - The Viv expression constituting the condition that was tested.
 * @param succeeded - Whether the condition succeeded, i.e., produced a truthy value when tested.
 * @returns Nothing. The test result is recorded via side effects.
 * @throws {VivInternalError} The condition does not have source-code annotations (defensive guard).
 */
export async function recordConditionTestResult(
    constructDefinition: ConstructDefinition,
    condition: Expression,
    succeeded: boolean
): Promise<void> {
    const conditionSource = condition.source;
    if (!conditionSource) {
        throw new VivInternalError("Cannot derive debugging data for condition missing 'source' field");
    }
    await updateWatchedConstructState(
        constructDefinition,
        watchedConstructState => {
            const conditionKey = `${conditionSource.filePath}:${conditionSource.line}:${conditionSource.column}`;
            watchedConstructState.conditionTestResults[conditionKey] ??= {
                condition: conditionSource.code,
                successes: 0,
                failures: 0
            };
            if (succeeded) {
                watchedConstructState.conditionTestResults[conditionKey].successes++;
            } else {
                watchedConstructState.conditionTestResults[conditionKey].failures++;
            }
        }
    );
}

/**
 * Carries out the given operation to update the watched-construct state of the given construct.
 *
 * @param constructDefinition - Definition for the construct whose watched-construct state will be changed.
 * @param operation - A function that, when applied to the watched-construct state for
 *     the given construct, carries out a particular debugging operation.
 * @returns Nothing. Updates the Viv internal state accordingly.
 * @throws {VivInternalError} The construct has an invalid type (defensive guard).
 */
async function updateWatchedConstructState(
    constructDefinition: ConstructDefinition,
    operation: (state: WatchedConstructDebuggingState) => void
): Promise<void> {
    // If the construct is not being watched, return now
    if (!isWatchedConstruct(constructDefinition)) {
        return;
    }
    // Otherwise, retrieve its watched-construct debugging state
    const vivInternalState = await GATEWAY.getVivInternalState();
    if (!vivInternalState.debugging?.watchlists) {
        return;
    }
    let watchedConstructState: WatchedConstructDebuggingState;
    switch (constructDefinition.type) {
        case ConstructDiscriminator.Action:
            watchedConstructState = vivInternalState.debugging.watchlists.actions[constructDefinition.name];
            break;
        case ConstructDiscriminator.ActionSelector:
            watchedConstructState = vivInternalState.debugging.watchlists.actionSelectors[constructDefinition.name];
            break;
        case ConstructDiscriminator.Plan:
            watchedConstructState = vivInternalState.debugging.watchlists.plans[constructDefinition.name];
            break;
        case ConstructDiscriminator.PlanSelector:
            watchedConstructState = vivInternalState.debugging.watchlists.planSelectors[constructDefinition.name];
            break;
        case ConstructDiscriminator.Query:
            watchedConstructState = vivInternalState.debugging.watchlists.queries[constructDefinition.name];
            break;
        case ConstructDiscriminator.SiftingPattern:
            watchedConstructState = vivInternalState.debugging.watchlists.siftingPatterns[constructDefinition.name];
            break;
        case ConstructDiscriminator.Trope:
            watchedConstructState = vivInternalState.debugging.watchlists.tropes[constructDefinition.name];
            break;
        default:
            throw new VivInternalError(`Invalid construct type: ${(constructDefinition as any).type}`);
    }
    // Perform the update operation
    operation(watchedConstructState);
    // Persist the updated Viv internal state
    await GATEWAY.saveVivInternalState(vivInternalState);
}

/**
 * Returns whether the given construct is on a watchlist.
 *
 * @param constructDefinition - The construct in question.
 * @returns Whether the given construct is on the watchlist.
 * @throws {VivInternalError} The construct has an invalid type (defensive guard).
 */
function isWatchedConstruct(constructDefinition: ConstructDefinition): boolean {
    const watchlists = GATEWAY.debug?.watchlists;
    if (!watchlists) {
        return false;
    }
    switch (constructDefinition.type) {
        case ConstructDiscriminator.Action:
            return !!watchlists.actions && watchlists.actions.includes(constructDefinition.name);
        case ConstructDiscriminator.ActionSelector:
            return !!watchlists.actionSelectors && watchlists.actionSelectors.includes(constructDefinition.name);
        case ConstructDiscriminator.Plan:
            return !!watchlists.plans && watchlists.plans.includes(constructDefinition.name);
        case ConstructDiscriminator.PlanSelector:
            return !!watchlists.planSelectors && watchlists.planSelectors.includes(constructDefinition.name);
        case ConstructDiscriminator.Query:
            return !!watchlists.queries && watchlists.queries.includes(constructDefinition.name);
        case ConstructDiscriminator.SiftingPattern:
            return !!watchlists.siftingPatterns && watchlists.siftingPatterns.includes(constructDefinition.name);
        case ConstructDiscriminator.Trope:
            return !!watchlists.tropes && watchlists.tropes.includes(constructDefinition.name);
        default:
            throw new VivInternalError(`Invalid construct type: ${(constructDefinition as any).type}`);
    }
}

/**
 * Emits an action targeting event via the adapter's debugging callback, if one is configured.
 *
 * @param event - The action targeting event to emit.
 * @returns Nothing. The event is emitted via the adapter's debugging callback as a side effect.
 */
export function emitActionTargetingEvent(event: ActionTargetingEvent): void {
    GATEWAY.debug?.callbacks?.onActionTargetingEvent?.(event);
}

/**
 * Emits a plan-execution event via the adapter's debugging callback, if one is configured.
 *
 * @param event - The plan-execution event to emit.
 * @returns Nothing. The event is emitted via the adapter's debugging callback as a side effect.
 */
export function emitPlanExecutionEvent(event: PlanExecutionEvent): void {
    GATEWAY.debug?.callbacks?.onPlanExecutionEvent?.(event);
}
