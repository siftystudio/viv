import type { DiegeticTimestamp, UID } from "../adapter/types";
import type {
    ActionDefinition,
    ActionSelectorDefinition,
    PlanDefinition,
    PlanSelectorDefinition
} from "../content-bundle/types";
import type {
    Expression,
    ReactionTargetConstruct,
    ReactionValue,
    SetPredicate,
    StringField,
    TemporalConstraint
} from "../dsl/types";
import type { EvaluationContext } from "../interpreter/types";
import type {
    QueuedAction,
    QueuedActionSelector,
    QueuedActionTemporalConstraints,
    QueuedActionTemporalConstraintTimeFrame,
    QueuedActionTemporalConstraintTimeOfDay,
    QueuedConstruct,
    QueuedConstructAbandonmentConditions,
    QueuedConstructRepeatLogic,
    QueuedPlan,
    QueuedPlanSelector
} from "./types";
import type { RoleBindings } from "../role-caster/types";
import { ConstructDiscriminator } from "../content-bundle";
import { ExpressionDiscriminator } from "../dsl";
import { VivExecutionError, VivInternalError } from "../errors";
import { GATEWAY } from "../gateway";
import {
    dehydrateEvaluationContext,
    getEvaluationContextFromBindings,
    interpretExpression,
    isTruthy
} from "../interpreter";
import { targetQueuedPlan, targetQueuedPlanSelector } from "../planner";
import {
    dehydrateEntityReference,
    getActionView,
    groundRelativePointInTime,
    isNumber,
    isString
} from "../utils";
import { QueuedConstructDiscriminator, QueuedConstructStatus } from "./constants";
import { isTimeOfDayStatement } from "./utils";

/**
 * Acts on the given reaction declaration to queue the given construct (via side effects) and return its UID.
 *
 * If a queued action or queued action selector is provided, it will be inserted into its associated
 * initiator's action queue. If a queued plan or queued plan selector is provided, it will be appended
 * to the end of the plan queue.
 *
 * Note: We return a UID here because the planner requires this to handle reaction windows.
 *
 * @param constructDefinition - Definition for the Viv construct that is to be queued.
 * @param precastBindings - Precast bindings for the construct to be queued.
 * @param reactionDeclaration - The Viv reaction declaration resulting in this queueing.
 * @param enclosingEvaluationContext - The Viv evaluation context for the closure containing the given reaction.
 * @returns The UID for the queued construct.
 */
export async function queueConstruct(
    constructDefinition: ReactionTargetConstruct,
    precastBindings: RoleBindings,
    reactionDeclaration: ReactionValue,
    enclosingEvaluationContext: EvaluationContext
): Promise<UID> {
    switch (constructDefinition.type) {
        case ConstructDiscriminator.Action:
        case ConstructDiscriminator.ActionSelector:
            return await queueAction(
                constructDefinition,
                precastBindings,
                reactionDeclaration,
                enclosingEvaluationContext
            );
        case ConstructDiscriminator.Plan:
        case ConstructDiscriminator.PlanSelector:
            return await queuePlan(
                constructDefinition,
                precastBindings,
                reactionDeclaration,
                enclosingEvaluationContext
            );
    }
}

/**
 * Queues the given action or action selector for the initiator associated with the given
 * reaction declaration, and returns the queued action's UID.
 *
 * Note: We return a UID here because the planner requires this to handle reaction windows.
 *
 * @param actionDefinition - Definition for the action or action selector to queue.
 * @param precastBindings - Precast bindings for the construct to be queued.
 * @param reactionDeclaration - The Viv reaction declaration resulting in this queueing.
 * @param enclosingEvaluationContext - The Viv evaluation context for the closure containing the given reaction.
 * @returns The UID for the queued action.
 */
async function queueAction(
    actionDefinition: ActionDefinition | ActionSelectorDefinition,
    precastBindings: RoleBindings,
    reactionDeclaration: ReactionValue,
    enclosingEvaluationContext: EvaluationContext
): Promise<UID> {
    // Derive the required fields
    const queuedActionRequiredFields = await deriveQueuedActionRequiredFields(
        actionDefinition,
        precastBindings,
        reactionDeclaration,
        enclosingEvaluationContext
    );
    // Derive any applicable optional fields
    const queuedActionOptionalFields = await deriveQueuedActionOptionalFields(
        reactionDeclaration,
        enclosingEvaluationContext,
        queuedActionRequiredFields.causes[0] ?? null
    );
    // Merge them into the final queued action
    const queuedAction = {
        ...queuedActionRequiredFields,
        ...queuedActionOptionalFields
    } as QueuedAction | QueuedActionSelector;
    // Update the initiator's action queue (this will also set an initial pending status for the queued action)
    await insertIntoActionQueue(queuedAction);
    // Finally, return the UID for the queued action
    return queuedAction.id;
}

/**
 * Processes a reaction declaration to return an object containing only the required fields of a
 * corresponding queued action or queued action selector.
 *
 * @param actionDefinition - Definition for the action or action selector to queue.
 * @param precastBindings - Precast bindings for the construct to be queued.
 * @param reactionDeclaration - The Viv reaction declaration resulting in this queueing.
 * @param enclosingEvaluationContext - The Viv evaluation context for the closure containing the given reaction.
 * @returns An object containing only the required fields of a queued action.
 * @throws {VivInternalError} If the reaction does not have a priority (defensive guard).
 * @throws {VivExecutionError} If the reaction priority evaluates to a non-numeric value.
 */
async function deriveQueuedActionRequiredFields(
    actionDefinition: ActionDefinition | ActionSelectorDefinition,
    precastBindings: RoleBindings,
    reactionDeclaration: ReactionValue,
    enclosingEvaluationContext: EvaluationContext
): Promise<QueuedAction | QueuedActionSelector> {
    // Retrieve the initiator's entity ID. As part of the validation process for evaluating bindings,
    // we will have ensured that the initiator role is precast with a single entity ID.
    const initiatorRoleName = actionDefinition.initiator;
    const initiatorID = precastBindings[initiatorRoleName][0] as UID;
    // For the reaction options that take expressions as values, evaluate the expressions
    // to derive actual values parameterizing the queued action.
    let urgent = false;
    if (reactionDeclaration.urgent) {
        urgent = Boolean(await interpretExpression(reactionDeclaration.urgent, enclosingEvaluationContext));
    }
    if (!reactionDeclaration.priority) {
        throw new VivInternalError("Reaction queueing action (or action selector) does not have priority");
    }
    const priority = await interpretExpression(reactionDeclaration.priority, enclosingEvaluationContext);
    if (!isNumber(priority)) {
        const errorMessage = (
            `Construct '${enclosingEvaluationContext.__constructName__}' has bad reaction targeting `
            + `${reactionDeclaration.targetType} '${reactionDeclaration.targetName}' (non-numeric priority value)`
        );
        throw new VivExecutionError(
            errorMessage,
            { priorityExpression: reactionDeclaration.priority, evaluatedPriority: priority }
        );
    }
    // Compile the causes of the queued action, if any. Note that `__causes__` will always be present here.
    const causes = enclosingEvaluationContext.__causes__ as UID[];
    // Package up the required fields and return the result
    let queuedActionRequiredFields: QueuedAction | QueuedActionSelector;
    if (actionDefinition.type === ConstructDiscriminator.Action) {
        queuedActionRequiredFields = {
            type: QueuedConstructDiscriminator.Action,
            constructName: actionDefinition.name,
            id: await GATEWAY.provisionActionID(),
            initiator: initiatorID,
            precastBindings,
            urgent,
            priority,
            causes,
        };
    } else {
        queuedActionRequiredFields = {
            type: QueuedConstructDiscriminator.ActionSelector,
            constructName: actionDefinition.name,
            id: await GATEWAY.provisionActionID(),
            initiator: initiatorID,
            precastBindings,
            urgent,
            priority,
            causes,
        };
    }
    return queuedActionRequiredFields;
}

/**
 * Processes a reaction declaration to return an object containing the (applicable) optional fields
 * of a corresponding queued action or queued action selector.
 *
 * @param reactionDeclaration - A Viv reaction.
 * @param enclosingEvaluationContext - The Viv evaluation context for the closure containing the given reaction.
 * @param primaryCauseActionID - Entity ID for the action that directly caused this reaction, if any, else `null`.
 *     The only case where a reaction has no causes is when a plan is forcibly queued, via {@link forciblyQueuePlan},
 *     with no causes. In normal operation, every reaction will have a cause attributed.
 * @returns An object containing only the (applicable) optional fields of a queued action or queued action selector.
 */
async function deriveQueuedActionOptionalFields(
    reactionDeclaration: ReactionValue,
    enclosingEvaluationContext: EvaluationContext,
    primaryCauseActionID: UID | null
): Promise<Partial<QueuedAction> | Partial<QueuedActionSelector>> {
    // Prepare the (ephemeral) object containing the optional fields
    const queuedActionOptionalFields:
        | Partial<QueuedAction>
        | Partial<QueuedActionSelector> = {};
    // If there is a `location` option, honor it
    if (reactionDeclaration.location !== null) {
        // We need to ground the set predicates by evaluating the expressions composing their operands. Because
        // set predicate operands are expected to be composed by Viv expressions, we need to treat each entity
        // ID as a Viv string expressions.
        const groundedSetPredicates: SetPredicate[] = [];
        for (const setPredicate of reactionDeclaration.location) {
            const groundedOperand: Expression[] = [];
            for (const operandComponentExpression of setPredicate.operand) {
                const locationData = await interpretExpression(
                    operandComponentExpression,
                    enclosingEvaluationContext
                );
                const locationID = dehydrateEntityReference(locationData);
                if (!isString(locationID) || !(await GATEWAY.isEntityID(locationID))) {
                    const errorMessage = (
                        `Construct '${enclosingEvaluationContext.__constructName__}' has bad reaction targeting `
                        + `${reactionDeclaration.targetType} '${reactionDeclaration.targetName}' `
                        + " (location operand evaluated to non-location)"
                    );
                    throw new VivExecutionError(
                        errorMessage,
                        { operandExpression: operandComponentExpression, evaluatedOperand: locationID }
                    );
                }
                const locationIDStringExpression: StringField = {
                    type: ExpressionDiscriminator.String,
                    value: locationID,
                    source: null
                };
                groundedOperand.push(locationIDStringExpression);
            }
            const groundedSetPredicate: SetPredicate = {
                operator: setPredicate.operator,
                operand: groundedOperand
            };
            groundedSetPredicates.push(groundedSetPredicate);
        }
        queuedActionOptionalFields.location = groundedSetPredicates;
    }
    // If there is a `time` option, honor it
    if (reactionDeclaration.time !== null) {
        queuedActionOptionalFields.time = await groundQueuedActionTemporalConstraints(
            reactionDeclaration.time,
            primaryCauseActionID
        );
    }
    // If there is a `abandonmentConditions` option, honor it
    if (reactionDeclaration.abandonmentConditions !== null) {
        queuedActionOptionalFields.abandonmentConditions = await prepareAbandonmentConditions(
            reactionDeclaration,
            enclosingEvaluationContext
        );
    }
    // If there is a `repeatLogic` option, honor it
    if (reactionDeclaration.repeatLogic !== null) {
        queuedActionOptionalFields.repeatLogic = await prepareRepeatLogic(
            reactionDeclaration,
            enclosingEvaluationContext
        );
    }
    // Return the object containing the optional fields
    return queuedActionOptionalFields;
}

/**
 * Returns prepared abandonment conditions, including an evaluation context, to be attached to a queued construct.
 *
 * Note that we have to attach the current evaluation context here in order to preserve any local variables
 * that may be pertinent, which is a common case that results from an author queueing reactions within a loop.
 *
 * If we were to instead store the entity ID for the cause of this reaction, and then reconstruct a context
 * from its bindings, we would lose this local variable. This is the sole case where local variables persist
 * beyond action performance.
 *
 * @param reactionDeclaration - A Viv reaction.
 * @param enclosingEvaluationContext - The Viv evaluation context for the closure containing the given reaction.
 * @returns Prepared abandonment conditions, including an evaluation context.
 * @throws {VivInternalError} Reaction does not have abandonment conditions (defensive guard).
 */
export async function prepareAbandonmentConditions(
    reactionDeclaration: ReactionValue,
    enclosingEvaluationContext: EvaluationContext
): Promise<QueuedConstructAbandonmentConditions> {
    if (reactionDeclaration.abandonmentConditions === null) {
        throw new VivInternalError("Attempt to prepare abandonment conditions for reaction without any");
    }
    let rawAbandonmentConditions = reactionDeclaration.abandonmentConditions;
    const abandonmentConditions: QueuedConstructAbandonmentConditions = {
        conditions: [...rawAbandonmentConditions],  // Copy to be safe
        context: await dehydrateEvaluationContext(enclosingEvaluationContext)
    };
    return abandonmentConditions;
}

/**
 * Returns prepared repeat logic, including a dehydrated evaluation context, to be attached to a queued construct.
 *
 * The evaluation context is attached to preserve local variables from the closure in which the reaction was
 * declared (as in {@link prepareAbandonmentConditions}), and it is dehydrated so that up-to-date entity data
 * is fetched when the repeat conditions are evaluated later, potentially many timesteps after queueing.
 *
 * @param reactionDeclaration - A Viv reaction.
 * @param enclosingEvaluationContext - The Viv evaluation context for the closure containing the given reaction.
 * @returns Prepared repeat logic, including an evaluation context.
 * @throws {VivInternalError} If the reaction does not have repeat logic (defensive guard).
 */
async function prepareRepeatLogic(
    reactionDeclaration: ReactionValue,
    enclosingEvaluationContext: EvaluationContext
): Promise<QueuedConstructRepeatLogic> {
    if (reactionDeclaration.repeatLogic === null) {
        throw new VivInternalError("Attempt to prepare repeat logic for reaction without any");
    }
    const repeatLogic: QueuedConstructRepeatLogic = {
        conditions: [...reactionDeclaration.repeatLogic.conditions],
        context: await dehydrateEvaluationContext(enclosingEvaluationContext),
        remainingInstances: reactionDeclaration.repeatLogic.maxRepeats
    };
    return repeatLogic;
}

/**
 * Converts relative temporal constraints from a reaction declaration into the grounded temporal
 * constraints required in queued action data.
 *
 * For instance, if an author specifies that a reaction can only occur between seven and ten days from the
 * performance of its precipitating action, we need to ground the ends of that time window in story time, by
 * converting them into actual timestamps in the running simulation instance at hand in the host application.
 *
 * @param ungroundedTemporalConstraints - A set of 1-3 temporal statements, originating in the reaction
 *     declaration, that constrain the time at which the queued action may be performed.
 * @param primaryCauseID - Entity ID for the action that directly caused this reaction, if any, else `null`.
 *     The only case where a reaction has no causes is when a plan is forcibly queued, via {@link forciblyQueuePlan},
 *     with no causes. In normal operation, every reaction will have a cause attributed.
 * @returns Temporal constraints grounded in story time.
 * @throws {VivInternalError} If `primaryCauseID` is `null`, but one of the temporal constraints
 *     specifies `useActionTimestamp` (defensive guard).
 */
async function groundQueuedActionTemporalConstraints(
    ungroundedTemporalConstraints: TemporalConstraint[],
    primaryCauseID: UID | null
): Promise<QueuedActionTemporalConstraints> {
    let currentTimestamp: DiegeticTimestamp | undefined = undefined;
    let timeOfDayConstraint: QueuedActionTemporalConstraintTimeOfDay | null = null;
    let timeFrameConstraint: QueuedActionTemporalConstraintTimeFrame | null = null;
    let timeFrameConstraintOpen: DiegeticTimestamp | null = null;
    let timeFrameConstraintClose: DiegeticTimestamp | null = null;
    for (const temporalStatement of ungroundedTemporalConstraints) {
        // If it's a time-of-day constraint, simply retrieve its open and close (no grounding required)
        if (isTimeOfDayStatement(temporalStatement)) {
            timeOfDayConstraint = {
                open: temporalStatement.open,
                close: temporalStatement.close
            };
            continue;
        }
        // Otherwise, it's a time-frame temporal constraint that must be grounded into absolute timestamps,
        // in story time. To do this, we must use the host application gateway. Depending on the time-frame
        // constraint at hand, we will use either the current simulation timestamp or the timestamp of the
        // action that triggered the reaction that is now resulting in action queueing. If each kind of
        // time-frame constraint appears, we will determine the overlap between the two windows specified
        // by the respective constraints.
        let anchorTimestamp: DiegeticTimestamp;
        if (temporalStatement.useActionTimestamp) {
            if (!primaryCauseID) {
                throw new VivInternalError("Cannot ground temporal constraint");
            }
            const primaryCauseData = await getActionView(primaryCauseID);
            anchorTimestamp = primaryCauseData.timestamp;
        } else {
            currentTimestamp = currentTimestamp || await GATEWAY.getCurrentTimestamp();
            anchorTimestamp = currentTimestamp;
        }
        if (temporalStatement.open) {
            const openTimestamp = groundRelativePointInTime(anchorTimestamp, temporalStatement.open);
            // If a previous temporal statement already specified a window, we need to
            // home in on the overlap between the respective windows.
            if (timeFrameConstraintOpen === null) {
                timeFrameConstraintOpen = openTimestamp;
            } else {
                timeFrameConstraintOpen = Math.max(timeFrameConstraintOpen, openTimestamp)
            }
        }
        if (temporalStatement.close) {
            const closeTimestamp = groundRelativePointInTime(anchorTimestamp, temporalStatement.close);
            // Again, we may need to home in on an overlap between two windows
            if (timeFrameConstraintClose === null) {
                timeFrameConstraintClose = closeTimestamp;
            } else {
                timeFrameConstraintClose = Math.min(timeFrameConstraintClose, closeTimestamp)
            }
        }
    }
    if (timeFrameConstraintOpen !== null || timeFrameConstraintClose !== null) {
        timeFrameConstraint = {
            open: timeFrameConstraintOpen,
            close: timeFrameConstraintClose
        };
    }
    const groundedTemporalConstraints: QueuedActionTemporalConstraints = {
        timeFrame: timeFrameConstraint,
        timeOfDay: timeOfDayConstraint
    };
    return groundedTemporalConstraints;
}

/**
 * Inserts the given queued action or queued action selector into its initiator's action queue.
 *
 * This function retrieves the current queued actions for the prospective initiator at hand, inserts the given
 * action into the queue, and then sets the updated action queue. For insertion, the following invariants are
 * maintained: urgent queued actions come first, and the two buckets (urgent, non-urgent) are themselves sorted
 * in order of priority. If there is a priority tie within a bucket, the new one will be placed last. Note that
 * it's not worth implementing a priority queue here, because we never pop from the front, but rather iterate
 * over the queue to attempt each queued action in turn. As such, it's only imperative to maintain the sort,
 * not to quickly pop a front element.
 *
 * Note: This function also sets the queued action's {@link QueuedConstructStatus}.
 *
 * @param queuedAction - The queued action or queued action selector to insert into its initiator's action queue.
 * @returns Nothing. Queueing persists via invocation of the host application's Viv adapter.
 */
export async function insertIntoActionQueue(
    queuedAction: QueuedAction | QueuedActionSelector
): Promise<void> {
    // Retrieve the current action queue for this character
    const updatedActionQueue = await GATEWAY.getActionQueue(queuedAction.initiator);
    // Insert the new one into the queue
    let inserted = false;
    for (let i = 0; i < updatedActionQueue.length; i++) {
        const existingQueuedAction = updatedActionQueue[i];
        if (existingQueuedAction.urgent && !queuedAction.urgent) {
            continue;
        }
        if (queuedAction.urgent && !existingQueuedAction.urgent) {
            updatedActionQueue.splice(i, 0, queuedAction);
            inserted = true;
            break;
        }
        if (existingQueuedAction.priority < queuedAction.priority) {
            updatedActionQueue.splice(i, 0, queuedAction);  // Modifies it in place
            inserted = true;
            break;
        }
    }
    if (!inserted) {
        // It wasn't inserted in the middle of the queue, which means it needs to go on the end
        updatedActionQueue.push(queuedAction);
    }
    // Set the updated queue
    await GATEWAY.saveActionQueue(queuedAction.initiator, updatedActionQueue);
    // Set an initial pending status for the queued action
    await GATEWAY.saveQueuedConstructStatus(
        queuedAction.id,
        QueuedConstructStatus.Pending
    );

}

/**
 * Removes the given queued action (or queued action selector) from its initiator's action queue.
 *
 * Note: This function also sets the queued action's {@link QueuedConstructStatus}.
 *
 * @param queuedAction - The queued action or queued action selector to remove from the initiator's action queue.
 * @param succeeded - Whether the queued action succeeded (i.e., whether a corresponding action was performed).
 * @returns Nothing. Dequeueing persists via invocation of the host application's Viv adapter.
 */
export async function removeFromActionQueue(
    queuedAction: QueuedAction | QueuedActionSelector,
    succeeded: boolean
): Promise<void> {
    // Update the initiator's action queue
    const actionQueue = await GATEWAY.getActionQueue(queuedAction.initiator);
    const updatedActionQueue = actionQueue.filter(otherQueuedAction => otherQueuedAction.id !== queuedAction.id);
    await GATEWAY.saveActionQueue(queuedAction.initiator, updatedActionQueue);
    // Update the queued action's status
    const updatedStatus = succeeded
        ? QueuedConstructStatus.Succeeded
        : QueuedConstructStatus.Failed;
    await GATEWAY.saveQueuedConstructStatus(queuedAction.id, updatedStatus);
}

/**
 * Queues the given plan or plan selector associated with the given reaction declaration, and returns its UID.
 *
 * If the reaction is marked urgent, the queued plan (selector) will be immediately targeted as well,
 * which may result in it being launched right now.
 *
 * Note: We return a UID here because the planner requires this to handle reaction windows.
 *
 * @param planDefinition - Definition for the plan or plan selector to queue.
 * @param precastBindings - Precast bindings for the construct to be queued.
 * @param reactionDeclaration - The Viv reaction declaration resulting in this queueing.
 * @param enclosingEvaluationContext - The Viv evaluation context for the closure containing the given reaction.
 * @returns The UID for the queued plan.
 */
async function queuePlan(
    planDefinition: PlanDefinition | PlanSelectorDefinition,
    precastBindings: RoleBindings,
    reactionDeclaration: ReactionValue,
    enclosingEvaluationContext: EvaluationContext
): Promise<UID> {
    // Compile the causes of the queued plan, if any. Note that `__causes__` will always be present here.
    const causes = enclosingEvaluationContext.__causes__ as UID[];
    // Determine whether this queued plan will be marked urgent, in which case it
    // will be immediately targeted (and potentially launched) upon being queued.
    let urgent = false;
    if (reactionDeclaration.urgent) {
        urgent = Boolean(await interpretExpression(reactionDeclaration.urgent, enclosingEvaluationContext));
    }
    // Create the queued plan or queued plan selector
    let queuedPlan: QueuedPlan | QueuedPlanSelector;
    if (planDefinition.type === ConstructDiscriminator.Plan) {
        queuedPlan = {
            type: QueuedConstructDiscriminator.Plan,
            constructName: planDefinition.name,
            id: await GATEWAY.provisionActionID(),
            urgent,
            precastBindings,
            causes,
        }
    } else {
        queuedPlan = {
            type: QueuedConstructDiscriminator.PlanSelector,
            constructName: planDefinition.name,
            id: await GATEWAY.provisionActionID(),
            urgent,
            precastBindings,
            causes,
        }
    }
    // If there is an `abandonmentConditions` option, honor it
    if (reactionDeclaration.abandonmentConditions !== null) {
        queuedPlan.abandonmentConditions = await prepareAbandonmentConditions(
            reactionDeclaration,
            enclosingEvaluationContext
        );
    }
    // If there is a `repeatLogic` option, honor it
    if (reactionDeclaration.repeatLogic !== null) {
        queuedPlan.repeatLogic = await prepareRepeatLogic(
            reactionDeclaration,
            enclosingEvaluationContext
        );
    }
    // Update the global plan queue (this will also set an initial pending status for the queued plan)
    await appendToPlanQueue(queuedPlan);
    // If the reaction was marked urgent, we will also immediately target the plan, and if targeting succeeds,
    // we will launch the plan right now. Note that plan launching entails dequeueing the plan.
    if (urgent) {
        if (queuedPlan.type === QueuedConstructDiscriminator.Plan) {
            await targetQueuedPlan(queuedPlan);
        } else if (queuedPlan.type === QueuedConstructDiscriminator.PlanSelector) {
            await targetQueuedPlanSelector(queuedPlan);
        }
    }
    // Finally, return the UID for the queued plan
    return queuedPlan.id;
}

/**
 * Appends the given queued plan or queued plan selector to the end of the global plan queue.
 *
 * While the plan queue is technically FIFO, it's important to note that queue order does not really matter here,
 * because a) all plans are greedily pursued each planner tick and b) launching a plan can only cause actions to
 * be queued, and not immediately performed. As such, the plan that is launched first will only have its actions
 * *queued* first, and from there the actions will be targeted in priority order. We simply append to the end of
 * the plan queue here, but in actuality the queue is conceptually unordered.
 *
 * Note: This function also sets the queued plan's {@link QueuedConstructStatus}.
 *
 * @param queuedPlan - The queued plan or queued plan selector to append to the global plan queue.
 * @returns Nothing. Queueing persists via invocation of the host application's Viv adapter.
 */
export async function appendToPlanQueue(
    queuedPlan: QueuedPlan | QueuedPlanSelector
): Promise<void> {
    // Update the plan queue
    const updatedPlanQueue = await GATEWAY.getPlanQueue();
    updatedPlanQueue.push(queuedPlan);
    await GATEWAY.savePlanQueue(updatedPlanQueue);
    // Set an initial pending status for the queued plan
    await GATEWAY.saveQueuedConstructStatus(
        queuedPlan.id,
        QueuedConstructStatus.Pending
    );
}

/**
 * Remove the given queued plan or queued plan selector from the global plan queue.
 *
 * Note: We do not have a `succeeded` parameter here, as in {@link removeFromActionQueue}, because plans
 * remain in the pending status following launching, and only reach a terminal status when a phase fails
 * or all phases succeed.
 *
 * @param queuedPlan - The queued plan or queued plan selector to remove from the global plan queue.
 * @param abandoned - Whether dequeueing is due to the queued plan or queued plan selector being abandoned.
 * @returns Nothing. The queue is updated via invocation of the host application's Viv adapter.
 */
export async function removeFromPlanQueue(
    queuedPlan: QueuedPlan | QueuedPlanSelector,
    abandoned = false
): Promise<void> {
    // Update the global plan queue
    const planQueue = await GATEWAY.getPlanQueue();
    const updatedPlanQueue = planQueue.filter(otherQueuedPlan => otherQueuedPlan.id !== queuedPlan.id);
    await GATEWAY.savePlanQueue(updatedPlanQueue);
    // If applicable, update the queued plan's status
    if (abandoned) {
        await GATEWAY.saveQueuedConstructStatus(
            queuedPlan.id,
            QueuedConstructStatus.Failed
        );
    }
}

/**
 * Returns whether the given queued construct's abandonment conditions hold.
 *
 * @param queuedConstruct - The queued construct whose abandonment conditions will be tested.
 * @returns Whether the given queued construct's abandonment conditions hold.
 */
export async function abandonmentConditionsHold(queuedConstruct: QueuedConstruct): Promise<boolean> {
    if (!queuedConstruct.abandonmentConditions) {
        return false;
    }
    for (const abandonmentCondition of queuedConstruct.abandonmentConditions.conditions) {
        const evaluation = await interpretExpression(
            abandonmentCondition,
            queuedConstruct.abandonmentConditions.context,
            true
        );
        if (!isTruthy(evaluation)) {
            return false;
        }
    }
    return true;
}

/**
 * Returns whether the given repeat logic's conditions all hold.
 *
 * @param repeatLogic - The prepared repeat logic whose conditions will be evaluated.
 * @returns Whether the given queued construct's repeat conditions hold.
 */
export async function repeatConditionsHold(repeatLogic: QueuedConstructRepeatLogic): Promise<boolean> {
    for (const repeatCondition of repeatLogic.conditions) {
        const evaluation = await interpretExpression(repeatCondition, repeatLogic.context, true);
        if (!isTruthy(evaluation)) {
            return false;
        }
    }
    return true;
}

/**
 * Re-queues a copy of the given queued action (or queued action selector).
 *
 * A few notes:
 *  - If we're doing this, `sourceQueuedAction` was just successfully performed.
 *  - The re-queued construct will be given a fresh UID.
 *  - The re-queued construct will have the same causes as the action that just succeeded,
 *    rather than that action being attributed as its sole case.
 *  - `remainingInstances` will be decremented by one.
 *
 * @param sourceQueuedAction - The queued action (or action selector) that just succeeded.
 * @returns Nothing. The re-queued action is inserted into the initiator's action queue.
 * @throws {VivInternalError} If `sourceQueuedAction` does not have repeat logic (defensive guard).
 */
export async function requeueAction(sourceQueuedAction: QueuedAction | QueuedActionSelector): Promise<void> {
    // Construct the re-queued action from the source, but with a fresh UID
    const reQueuedAction: QueuedAction | QueuedActionSelector = {
        ...sourceQueuedAction,
        id: await GATEWAY.provisionActionID()
    };
    // Decrement the remaining instances on the re-queued action's repeat logic
    if (!reQueuedAction.repeatLogic) {
        throw new VivInternalError("Attempt to re-queue action with no repeat logic");
    }
    reQueuedAction.repeatLogic = {
        ...reQueuedAction.repeatLogic,
        remainingInstances: reQueuedAction.repeatLogic.remainingInstances - 1
    };
    // Insert the re-queued action into the initiator's action queue
    await insertIntoActionQueue(reQueuedAction);
}

/**
 * Re-queues a copy of the given queued plan (or queued plan selector).
 *
 * A few notes:
 *  - If we're doing this, `sourceQueuedPlan` was just successfully performed.
 *  - The re-queued construct will be given a fresh UID.
 *  - The re-queued construct will have the same causes as the action that just succeeded,
 *    rather than that action being attributed as its sole case.
 *  - `remainingInstances` will be decremented by one.
 *
 * @param sourceQueuedPlan - The original queued plan (or plan selector) stashed at launch time.
 * @returns Nothing. The re-queued plan is appended to the global plan queue.
 * @throws {VivInternalError} If `sourceQueuedPlan` does not have repeat logic (defensive guard).
 */
export async function requeuePlan(sourceQueuedPlan: QueuedPlan | QueuedPlanSelector): Promise<void> {
    // Construct the re-queued plan from the source, but with a fresh UID
    const reQueuedPlan: QueuedPlan | QueuedPlanSelector = {
        ...sourceQueuedPlan,
        id: await GATEWAY.provisionActionID(),
    };
    // Decrement the remaining instances on the re-queued plan's repeat logic
    if (!reQueuedPlan.repeatLogic) {
        throw new VivInternalError("Attempt to re-queue plan with no repeat logic");
    }
    reQueuedPlan.repeatLogic = {
        ...reQueuedPlan.repeatLogic,
        remainingInstances: reQueuedPlan.repeatLogic.remainingInstances - 1
    };
    // Append the re-queued plan to the global plan queue
    await appendToPlanQueue(reQueuedPlan);
}

/**
 * Forces queueing of the given plan with the given precast bindings.
 *
 * This function is the internal implementation for the public API function {@link queuePlan}. As such,
 * it is not invoked internally by other runtime code, because it is only intended to be invoked externally,
 * by a consumer of the Viv runtime -- i.e., by a host application using the runtime API.
 *
 * @param planDefinition - Definition for the plan to forcibly queue.
 * @param precastBindings - Partial or complete bindings for the given plan.
 * @param urgent - Whether to queue the plan urgently, in which case it will immediately be targeted (and may
 *     immediately be launched).
 * @param forcedCauses - An array optionally containing entity IDs for arbitrary actions that
 *     the host application has indicated as causes of the plan to forcibly queue.
 */
export async function forciblyQueuePlan(
    planDefinition: PlanDefinition,
    precastBindings: RoleBindings,
    urgent: boolean,
    forcedCauses: UID[]
): Promise<UID> {
    // First, we need to create a dummy reaction value
    const dummyReactionValue: ReactionValue = {
        targetName: planDefinition.name,
        targetType: ConstructDiscriminator.Plan,
        bindings: { partial: true, roles: {} },  // These will be ignored in favor of `precastBindings`
        urgent: {
            type: ExpressionDiscriminator.Bool,
            value: urgent,
            source: null
        },
        priority: null,
        location: null,
        time: null,
        repeatLogic: null,
        abandonmentConditions: null
    };
    // Next, let's create an evaluation context (and inject any forced causes into it)
    const evaluationContext = getEvaluationContextFromBindings(planDefinition, precastBindings);
    evaluationContext.__causes__ = forcedCauses;
    // Finally, queue the plan and return the resulting UID for the queued plan
    return await queuePlan(planDefinition, precastBindings, dummyReactionValue, evaluationContext);
}
