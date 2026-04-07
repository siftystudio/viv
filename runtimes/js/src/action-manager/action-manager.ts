import type { ActionView, CharacterView, TimeOfDay, UID } from "../adapter/types";
import type { ActionDefinition, ActionName, ActionSelectorDefinition } from "../content-bundle/types";
import type { TimeDelta } from "../dsl/types";
import type { EvaluationContext } from "../interpreter/types";
import type { QueuedAction, QueuedActionSelector } from "../queue-manager/types";
import type { InitiatorLevelCache, RoleBindings, RoleCastingResult } from "../role-caster/types";
import type { SelectorResult } from "../selector-runner/types";
import type { ActiveEmbargo } from "./types";
import { EntityType } from "../adapter";
import { CONTENT_BUNDLE, ConstructDiscriminator, RoleEntityType, RoleParticipationMode } from "../content-bundle";
import {
    ActionTargetingEventImpetus,
    TargetingEventStatus,
    emitActionTargetingEvent,
    recordTargetingAttempt
} from "../debugger";
import { SetPredicateOperator } from "../dsl";
import { VivExecutionError, VivInternalError, VivRoleCastingError } from "../errors";
import { GATEWAY } from "../gateway";
import { interpretExpression, prepareDummyEvaluationContext } from "../interpreter";
import { formMemories, processRelayedActions } from "../knowledge-manager";
import {
    QueuedConstructDiscriminator,
    abandonmentConditionsHold,
    requeueAction,
    removeFromActionQueue,
    repeatConditionsHold
} from "../queue-manager";
import { actionRoleRequiresPresence, castRoles } from "../role-caster";
import { targetSelector } from "../selector-runner";
import { setPredicateHolds } from "../story-sifter";
import {
    clone,
    deduplicate,
    getActionDefinition,
    getActionSelectorDefinition,
    getCharacterData,
    getRoleDefinition,
    groundRelativePointInTime,
    isNumber,
    isString,
    randomID,
    shuffle,
    timeOfDayIsAtOrAfter
} from "../utils";
import { SpecialRoleName } from "./constants";

/**
 * Carries out action selection for the given initiator and returns the entity ID for the action that is
 * performed as a result, if any, else `null`.
 *
 * If `urgentOnly` is `true`, *only* urgent queued actions will be targeted, and action selection will fail if
 * no urgent queued actions exist or none are successfully performed. If `urgentOnly` is not `true`, the action
 * manager will also target each of the character's non-urgent queued actions, if any. And if there are none of
 * those, or if none are successfully performed, the action manager will then attempt to perform a general action,
 * meaning one that is defined in the Viv content bundle and is not marked `reserved`.
 *
 * This function is the internal implementation for the public API function {@link selectAction}. As such,
 * it is not invoked internally by other runtime code, because it is only intended to be invoked externally,
 * by a consumer of the Viv runtime -- i.e., by a host application using the runtime API.
 *
 * @param initiatorID - Entity ID for the character who will be cast in an initiator role, should action
 *     selection succeed here.
 * @param urgentOnly - If `true`, *only* urgent queued actions will be targeted. This enables a simulation
 *     pattern whereby characters target urgent actions once a timestep has otherwise completed, to
 *     allow for emergent sequences to fully play out.
 * @returns If an action is performed, its entity ID, else `null`.
 * @throws {VivInternalError} If a queued construct has an unexpected type (defensive guard).
 */
export async function selectAction(initiatorID: UID, urgentOnly: boolean): Promise<UID | null> {
    // We'll commence by retrieving the initiator's data and preparing an initiator-level cache,
    // which will cache data frequently required during action selection for this character.
    const initiatorData = await getCharacterData(initiatorID);
    const initiatorLevelCache = await prepareInitiatorLevelCache(initiatorData);
    const actionQueue = await GATEWAY.getActionQueue(initiatorID);
    // First, attempt to perform a queued action, if applicable. These will always be sorted in priority
    // order (first criterion is the `urgent` field, second is the `priority` field). If we are only supposed
    // to target urgent actions, having no queued actions at all is grounds to immediately return `null`.
    if (urgentOnly && !actionQueue.length) {
        return null;
    }
    for (const queuedAction of actionQueue) {
        if (urgentOnly && !queuedAction.urgent) {
            // We are only supposed to target urgent queued actions in this call, but we got to a non-urgent
            // queued action, which means there are either no urgent queued actions or none that could be
            // successfully targeted at this time. In either case, we will return `null` now.
            return null;
        }
        let actionID: UID | null;
        if (queuedAction.type === QueuedConstructDiscriminator.Action) {
            actionID = await targetQueuedAction(queuedAction, initiatorLevelCache);
        } else if (queuedAction.type === QueuedConstructDiscriminator.ActionSelector) {
            actionID = await targetQueuedActionSelector(queuedAction, initiatorLevelCache);
        } else {
            throw new VivInternalError(
                `Unexpected type for construct queued in action queue: '${(queuedAction as any).type}'`
            );
        }
        if (actionID) {
            // We successfully targeted this queued action, so return its entity ID now, because
            // we always perform at most one action for a given invocation of this function.
            return actionID;
        }
    }
    if (urgentOnly) {
        return null;
    }
    // If we get to here, we have not performed a queued action, and we are allowed to
    // pursue non-urgent actions, so let's target a general action and return the result.
    return await targetGeneralAction(initiatorLevelCache);
}

/**
 * Returns an initiator-level cache, for use in role-casting data.
 *
 * @param initiatorData - Character view for the initiator at hand.
 * @returns An initiator-level cache, for use in role-casting data.
 */
async function prepareInitiatorLevelCache(initiatorData: CharacterView): Promise<InitiatorLevelCache> {
    let currentTimeOfDay: TimeOfDay | null = null;
    if (GATEWAY.getCurrentTimeOfDay) {
        currentTimeOfDay = await GATEWAY.getCurrentTimeOfDay();
    }
    const initiatorLevelCache: InitiatorLevelCache = {
        initiatorData,
        currentTimestamp: await GATEWAY.getCurrentTimestamp(),
        currentTimeOfDay: currentTimeOfDay,
        nearbyCharacterIDs: null,
        nearbyItemIDs: null,
    };
    return initiatorLevelCache;
}

/**
 * Targets the given queued action for the given initiator and returns the associated
 * entity ID if the action is performed, else `null`.
 *
 * @param queuedAction - A Viv queued action.
 * @param initiatorLevelCache - An initiator-level cache.
 * @returns If the action is performed, its entity ID, else `null`.
 */
async function targetQueuedAction(
    queuedAction: QueuedAction,
    initiatorLevelCache: InitiatorLevelCache,
): Promise<UID | null> {
    // Abandon targeting if constraints on the queued action do not currently hold. In certain cases,
    // the queued action will also be dequeued -- e.g., if its specified time window has closed.
    if (await cannotTargetQueuedAction(queuedAction, initiatorLevelCache)) {
        return null;
    }
    // Target the queued action
    const actionDefinition = getActionDefinition(queuedAction.constructName);
    const roleCastingResult = await targetAction(
        actionDefinition,
        queuedAction.precastBindings,
        initiatorLevelCache,
        ActionTargetingEventImpetus.Queued
    );
    // If targeting was successful, perform the resulting action and return its
    // entity ID. Note that action performance entails dequeueing the action.
    if (roleCastingResult.bindings) {
        return await performAction(
            actionDefinition,
            initiatorLevelCache.initiatorData,
            roleCastingResult.bindings,
            roleCastingResult.evaluationContext,
            queuedAction
        );
    }
    // Otherwise, return `null` to cue failure
    return null;
}

/**
 * Targets the given queued action selector for the given initiator and returns the associated
 * entity ID if an action is performed, else `null`.
 *
 * @param queuedAction - A Viv queued action selector.
 * @param initiatorLevelCache - An initiator-level cache.
 * @returns If an action is performed, its entity ID, else `null`.
 */
async function targetQueuedActionSelector(
    queuedAction: QueuedActionSelector,
    initiatorLevelCache: InitiatorLevelCache,
): Promise<UID | null> {
    // Abandon targeting if constraints on the queued action selector do not currently hold. In certain
    // cases, the queued action will also be dequeued -- e.g., if its specified time window has closed.
    if (await cannotTargetQueuedAction(queuedAction, initiatorLevelCache)) {
        return null;
    }
    // Target the queued action selector
    const actionSelectorDefinition = getActionSelectorDefinition(queuedAction.constructName);
    const selectorResult = await targetActionSelector(
        actionSelectorDefinition,
        queuedAction.precastBindings,
        initiatorLevelCache,
        ActionTargetingEventImpetus.Queued
    );
    // If targeting was successful, perform the resulting action and return its
    // entity ID. Note that action performance entails dequeueing the action.
    if (selectorResult.selectedConstructName) {
        return await performAction(
            getActionDefinition(selectorResult.selectedConstructName as ActionName),
            initiatorLevelCache.initiatorData,
            selectorResult.roleCastingResult.bindings,
            selectorResult.roleCastingResult.evaluationContext,
            queuedAction
        );
    }
    // Otherwise, return `null` to cue failure
    return null;
}

/**
 * Returns whether the given queued action (or queued action selector) cannot be targeted at this time.
 *
 * In certain cases, the queued action will also be dequeued (via side effects), such as
 * if its abandonment conditions hold or its specified time window has already closed.
 *
 * @param queuedAction - A Viv queued action or queued action selector.
 * @param initiatorLevelCache - An initiator-level cache.
 * @returns Whether the given queued action cannot be targeted at this time.
 */
async function cannotTargetQueuedAction(
    queuedAction: QueuedAction | QueuedActionSelector,
    initiatorLevelCache: InitiatorLevelCache
): Promise<boolean> {
    // Abandon targeting and dequeue if the queued action's abandonment conditions hold
    const mustAbandonQueuedAction = await abandonmentConditionsHold(queuedAction);
    if (mustAbandonQueuedAction) {
        // Permanently dequeue the queued action, because its abandonment conditions hold
        await removeFromActionQueue(queuedAction, false);
        // Abandon targeting
        return true;
    }
    // Abandon targeting if its spatio-temporal constraints are violated currently
    if (await queuedActionSpatioTemporalConstraintsViolated(queuedAction, initiatorLevelCache)) {
        return true;
    }
    // Abandon targeting if all the entities in roles requiring presence are not at the same location
    if (await queuedActionRequiredPresentEntitiesNotCoLocated(queuedAction, initiatorLevelCache)) {
        return true;
    }
    // Abandon targeting if this is a queued action that would violate an embargo
    if (queuedAction.type === QueuedConstructDiscriminator.Action) {
        if (await queuedActionViolatesEmbargo(queuedAction, initiatorLevelCache)) {
            return true;
        }
    }
    // If we get to here, phew, we can target the queued action!
    return false;
}

/**
 * Returns whether the given queued action's spatio-temporal constraints are currently violated.
 *
 * These constraints are defined by its `location` and `time` properties.
 *
 * Note: If the queued action's time window has closed, it will also be dequeued via side effects.
 *
 * @param queuedAction - A Viv queued action or queued action selector.
 * @param initiatorLevelCache - An initiator-level cache.
 * @returns Whether the queued action's spatio-temporal constraints are currently violated.
 */
async function queuedActionSpatioTemporalConstraintsViolated(
    queuedAction: QueuedAction | QueuedActionSelector,
    initiatorLevelCache: InitiatorLevelCache
): Promise<boolean> {
    // Abandon targeting if the initiator's location violates any relevant constraints
    if (queuedAction.location) {
        // Before we can test the location set predicates, we need to create a dummy evaluation context. This is
        // needed because set predicates expect their operand sets to be composed of arbitrary Viv expressions,
        // which is needed when constructing queries. In the case of a reaction location, the operand expressions
        // will have already been evaluated to the entity IDs for locations (at the time of action queueing), but
        // to conform to the expected shape, these will be represented as Viv string expressions whose values are
        // the entity IDs. This means the evaluation context will never be needed, because Viv string expressions
        // are literals, but of course a context is always expected when the interpreter is invoked, hence the
        // need for a dummy context.
        const dummyEvaluationContext = prepareDummyEvaluationContext();
        for (const setPredicate of queuedAction.location) {
            const predicateHolds = await setPredicateHolds(
                [initiatorLevelCache.initiatorData.location],
                setPredicate,
                dummyEvaluationContext
            );
            if (!predicateHolds) {
                return true;
            }
        }
    }
    // Abandon targeting if it is not the specified time frame for this queued action. If the
    // time window on performing this action has closed, dequeue it as well.
    if (queuedAction.time?.timeFrame?.open) {
        if (
            initiatorLevelCache.currentTimestamp !== null
            && initiatorLevelCache.currentTimestamp < queuedAction.time.timeFrame.open
        ) {
            // Abandon targeting, because the queued action's time window hasn't opened yet
            return true;
        }
    }
    if (queuedAction.time?.timeFrame?.close) {
        if (
            initiatorLevelCache.currentTimestamp !== null
            && initiatorLevelCache.currentTimestamp > queuedAction.time.timeFrame.close
        ) {
            // Permanently dequeue the queued action, because its time window has closed
            await removeFromActionQueue(queuedAction, false);
            // Abandon targeting
            return true;
        }
    }
    // Abandon targeting if it is not the specified time of day for this queued action
    if (queuedAction.time?.timeOfDay?.open) {
        if (initiatorLevelCache.currentTimeOfDay) {
            if (!timeOfDayIsAtOrAfter(initiatorLevelCache.currentTimeOfDay, queuedAction.time.timeOfDay.open)) {
                // Abandon targeting, because it's still too early in the day
                return true;
            }
        }
    }
    if (queuedAction.time?.timeOfDay?.close) {
        if (initiatorLevelCache.currentTimeOfDay) {
            if (timeOfDayIsAtOrAfter(initiatorLevelCache.currentTimeOfDay, queuedAction.time.timeOfDay.close)) {
                // Abandon targeting, because it's too late in the day
                return true;
            }
        }
    }
    return false;
}

/**
 * Returns whether the queued action's precast entities for roles requiring presence are not co-located right now.
 *
 * Unless a role carries the 'anywhere' label, entities cast into it must be co-located with the
 * initiator at the time of action performance. This function confirms that all entities precast
 * in such roles are currently at the same location as the initiator.
 *
 * @param queuedAction - A Viv queued action or queued action selector.
 * @param initiatorLevelCache - An initiator-level cache.
 * @returns Whether the queued action's precast entities for roles requiring presence are not co-located right now.
 * @throws {VivRoleCastingError} If the queued action precasts a non-entity in an entity role.
 */
async function queuedActionRequiredPresentEntitiesNotCoLocated(
    queuedAction: QueuedAction | QueuedActionSelector,
    initiatorLevelCache: InitiatorLevelCache
): Promise<boolean> {
    const constructDefinition = queuedAction.type === QueuedConstructDiscriminator.Action
        ? getActionDefinition(queuedAction.constructName)
        : getActionSelectorDefinition(queuedAction.constructName);
    for (const [roleName, roleCandidates] of Object.entries(queuedAction.precastBindings)) {
        const roleDefinition = getRoleDefinition(constructDefinition, roleName);
        if (roleDefinition.participationMode !== RoleParticipationMode.Initiator) {
            if (actionRoleRequiresPresence(roleDefinition)) {
                for (const entityID of roleCandidates) {
                    if (!isString(entityID) || !(await GATEWAY.isEntityID(entityID))) {
                        throw new VivRoleCastingError(
                            "Queued action precasts non-entity in entity role",
                            constructDefinition,
                            roleName,
                            { candidate: entityID }
                        );
                    }
                    const entityLocationID = await GATEWAY.getEntityLocation(entityID);
                    if (entityLocationID !== initiatorLevelCache.initiatorData.location) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

/**
 * Returns whether the given queued action violates an active embargo.
 *
 * A queued action will violate an embargo if its precast bindings are not allowed,
 * or are not allowed at the initiator's current location.
 *
 * Note: If the queued action will always violate a permanent embargo, it will also be
 * dequeued via side effects.
 *
 * @param queuedAction - A Viv queued action.
 * @param initiatorLevelCache - An initiator-level cache.
 * @returns Whether the given queued action violates an active embargo.
 */
async function queuedActionViolatesEmbargo(
    queuedAction: QueuedAction,
    initiatorLevelCache: InitiatorLevelCache
): Promise<boolean> {
    // Retrieve any active embargo violated by this queued action
    const violatedEmbargo = await getViolatedEmbargo(
        queuedAction.constructName,
        queuedAction.precastBindings,
        initiatorLevelCache.initiatorData.location as string,
        initiatorLevelCache
    );
    // If there is no embargo, return `false` now
    if (!violatedEmbargo) {
        return false;
    }
    // If there is a non-permanent embargo, return `true` now
    if (violatedEmbargo.expiration) {
        return true;
    }
    // For a permanent embargo: if the embargo either specifies no location, or if the queued action
    // specifies 'exactly' the embargoed location, we can go ahead and dequeue the action as well,
    // because it will never be possible to perform the action due to it being forever embargoed.
    let actionIsForeverEmbargoed = false;
    if (!violatedEmbargo.location) {
        actionIsForeverEmbargoed = true;
    } else if (queuedAction.location) {
        for (const setPredicate of queuedAction.location) {
            if (setPredicate.operator === SetPredicateOperator.Exactly) {
                // The operand here will be a singleton array containing a simple Viv expression that wraps
                // the entity ID for the specified single possible location of the queued action. It is
                // structured like this to conform to the requirements for testing set predicates. But as
                // such, we need to evaluate the expression to safely retrieve the location ID.
                const dummyEvaluationContext = prepareDummyEvaluationContext();
                const queuedActionLocationID = await interpretExpression(
                    setPredicate.operand[0],
                    dummyEvaluationContext
                );
                if (violatedEmbargo.location === queuedActionLocationID) {
                    actionIsForeverEmbargoed = true;
                }
            }
        }
    }
    if (actionIsForeverEmbargoed) {
        await removeFromActionQueue(queuedAction, false);
    }
    return true;
}

/**
 * Returns an active embargo that is violated by the given data, if any, else null.
 *
 * Note: If an embargo's expiration time has passed, it will be lifted via side effects.
 *
 * @param actionName - The name of the action whose current targeting may violate an embargo.
 * @param partialBindings - The partial bindings currently assembled during action targeting.
 * @param locationID - The location where the prospective action may take place.
 * @param initiatorLevelCache - An initiator-level cache.
 * @returns An active embargo that is violated by the given data, if any, else null.
 */
export async function getViolatedEmbargo(
    actionName: ActionName,
    partialBindings: RoleBindings,
    locationID: UID,
    initiatorLevelCache: InitiatorLevelCache,
): Promise<ActiveEmbargo | null> {
    // Retrieve any active embargoes associated with the target action
    const vivInternalState = await GATEWAY.getVivInternalState();
    const embargoes = vivInternalState.actionEmbargoes[actionName] ?? [];
    if (!embargoes.length) {
        return null;
    }
    // We will do a first pass over all embargoes to search for ones that may permanently hold for the
    // given bindings and locations. If such an embargo is violated, it may allow us to permanently
    // dequeue a queued action, which is desirable because early dequeueing is an optimization win.
    for (const embargo of embargoes) {
        if (
            initiatorLevelCache.currentTimestamp !== null
            && embargo.expiration
            && initiatorLevelCache.currentTimestamp > embargo.expiration
        ) {
            vivInternalState.actionEmbargoes[actionName] = vivInternalState.actionEmbargoes[actionName].filter(
                activeEmbargo => activeEmbargo.id !== embargo.id
            );
            await GATEWAY.saveVivInternalState(vivInternalState);
            continue;
        }
        if (embargo.expiration) {
            continue;
        }
        if (embargo.location && (embargo.location !== locationID)) {
            continue;
        }
        if (await embargoProhibitsBindings(partialBindings, locationID, embargo)) {
            // If applicable, dequeueing will happen upstream, where we have access to the queued action
            return embargo;
        }
    }
    // If there was no such permanent embargo, we'll do this second sweep over all of them
    for (const embargo of embargoes) {
        if (
            initiatorLevelCache.currentTimestamp !== null
            && embargo.expiration
            && initiatorLevelCache.currentTimestamp > embargo.expiration
        ) {
            continue;
        }
        if (await embargoProhibitsBindings(partialBindings, locationID, embargo)) {
            return embargo;
        }
    }
    // Otherwise, return `null` to cue that the queued action does not violate any active embargo
    return null;
}

/**
 * Returns whether the given embargo prohibits the given bindings at the given location.
 *
 * @param partialBindings - The (partial) bindings in question.
 * @param locationID - The location where the prospective action may take place.
 * @param embargo - The active embargo that may be violated in this case.
 * @returns Whether the given embargo prohibits the given bindings at the given location.
 */
async function embargoProhibitsBindings(
    partialBindings: RoleBindings,
    locationID: UID,
    embargo: ActiveEmbargo
): Promise<boolean> {
    // If the embargo has no specified location and no specified roles, then the action is
    // outright banned, so return true immediately.
    if (!embargo.location && !embargo.bindings) {
        return true;
    }
    // Otherwise, let's consider any location constraint
    if (embargo.location) {
        // If the embargo applies at a different location than the queued action's
        // specified location, return false now.
        if (locationID !== embargo.location) {
            return false;
        }
        // If the embargo applies at its same location and there's no further criteria,
        // the queued action violates the embargo, so return true now
        if (!embargo.bindings) {
            return true;
        }
    }
    // If we get to here, there must be role-based criteria, so let's consider that now to determine
    // whether the embargoed bindings hold with regard to the queued action's bindings. This check is
    // formally as follows: an embargo applies for a given set of bindings if for every embargoed role
    // there is at least one prohibited candidate present in the bindings for that role. As this suggests,
    // we only require a subset of embargoed entities to be present for each role to violate an embargo.
    if (embargo.bindings) {
        let embargoedRoleCombination = true;
        for (const [roleName, prohibitedCandidates] of Object.entries(embargo.bindings)) {
            if (!(partialBindings[roleName]?.some(candidate => prohibitedCandidates.includes(candidate)))) {
                embargoedRoleCombination = false;
                break;
            }
        }
        return embargoedRoleCombination;
    }
    // We shouldn't be able to get to here, but our types do not express that, so let's explicitly return
    return false;
}

/**
 * Carries out general action selection for the given character, and returns the entity ID for an action
 * that is performed as a result, if any, else `null`.
 *
 * Here, 'general' means that the character will not be targeting a queued action, but rather any action
 * in the pool of general actions defined in the content bundle -- as opposed to actions marked `reserved`,
 * which may only be targeted via selectors and reactions. Note that action selectors will also be targeted
 * here, but again not ones marked 'reserved'
 *
 * The process works here by randomly selecting valid bindings for a random available action -- i.e., it's a
 * random search in the space of plausible concrete actions (ones whose conditions hold). This aims to maintain
 * character believability (no one will do something they wouldn't believably do) at a low computational cost,
 * which is necessary for simulations with lots of characters and lots of possible actions. In other words, it
 * aims for *satisficing* actions in lieu of optimal actions, where fitness is operationalized as character
 * believability. This is in contrast to *volition systems* that select the most believable actions, but which
 * are typically implemented for simulations with only a few characters, and thus small possibility spaces in
 * terms of action bindings. See pp. 601--603 of my PhD thesis for more detail on this aspect of the approach.
 *
 * @param initiatorLevelCache - An initiator-level cache.
 * @returns If an action is performed, its entity ID, else `null`.
 * @throws {VivInternalError} If an unexpected construct type is encountered (defensive guard).
 */
async function targetGeneralAction(initiatorLevelCache: InitiatorLevelCache): Promise<UID | null> {
    // Load action and action-selector definitions, but discard any `reserved` ones, since they
    // can only be targeted if they've been queued for a character).
    const constructDefinitions: (ActionDefinition | ActionSelectorDefinition)[] = [];
    constructDefinitions.push(...Object.values(CONTENT_BUNDLE.actions));
    constructDefinitions.push(...Object.values(CONTENT_BUNDLE.actionSelectors));
    let constructPool = constructDefinitions.filter(construct => !construct.reserved);
    // Shuffle the prospective actions and action selectors
    shuffle(constructPool);
    // Start targeting actions!
    for (const constructDefinition of constructPool) {
        const precastBindings = {[constructDefinition.initiator]: [initiatorLevelCache.initiatorData.id]};
        if (constructDefinition.type === ConstructDiscriminator.Action) {
            const roleCastingResult = await targetAction(
                constructDefinition,
                precastBindings,
                initiatorLevelCache
            );
            if (roleCastingResult.bindings) {
                const actionID = await performAction(
                    constructDefinition,
                    initiatorLevelCache.initiatorData,
                    roleCastingResult.bindings,
                    roleCastingResult.evaluationContext,
                );
                return actionID;
            }
        } else if (constructDefinition.type === ConstructDiscriminator.ActionSelector) {
            const selectorResult = await targetActionSelector(
                constructDefinition,
                precastBindings,
                initiatorLevelCache,
                ActionTargetingEventImpetus.General
            );
            if (selectorResult.selectedConstructName) {
                const actionID = await performAction(
                    getActionDefinition(selectorResult.selectedConstructName as ActionName),
                    initiatorLevelCache.initiatorData,
                    selectorResult.roleCastingResult.bindings,
                    selectorResult.roleCastingResult.evaluationContext,
                );
                return actionID;
            }
        } else {
            throw new VivInternalError(
                "Encountered unexpected construct type during general action targeting: "
                + `'${(constructDefinition as any).type}'`
            );
        }
    }
    // If we couldn't successfully target an action, return `null` to indicate that
    // the character has not acted this timestep.
    return null;
}

/**
 * Targets the given action on behalf of the given character, returning a set of action bindings (and also
 * the final evaluation context) if targeting succeeds.
 *
 * The procedure here first attempts to assemble a *minimal cast* for this action -- i.e., a set of bindings
 * that casts at least `min` entities for all roles, where `min` is specified on a per-role basis. If we can
 * do this, action targeting succeeds, bindings will be returned, and the action will ultimately be performed.
 *
 * The process of assembling a minimal cast works recursively by calls to `castEntityInRole()`. Conceptually,
 * it works by a depth-first traversal of a role dependency tree whose directed edges indicate that the child
 * role depends on the parent role, which means the parent must always be cast first. This procedure was a
 * major optimization that represented a breakthrough in the Viv project.
 *
 * Rather than producing only the minimal bindings, this function will also attempt to also fill any optional
 * bindings by casting entities for each role in the slots between `min` and `max` (as applicable). Note that
 * optional roles are not included in the dependency tree, because they can be cast after a minimal cast has
 * been assembled without backtracking to other roles or role slots.
 *
 * @param actionDefinition - Definition for the action to target.
 * @param precastBindings - Partial or complete bindings that at a minimum bind the prospective initiator
 *     to the initiator role in the given action definition. In the case of a queued action being targeted,
 *     these bindings may also include all other roles, and may in fact be complete -- such "precast" bindings
 *     originate in selector definitions and reaction declarations created by Viv authors.
 * @param initiatorLevelCache - An initiator-level cache.
 * @param impetus - The impetus for this instance of action targeting. (Defaults to
 *     {@link ActionTargetingEventImpetus.General}.)
 * @param suppressConditions - Whether to ignore the action conditions during role casting. This supports
 *     the public API function {@link attemptActionAPI}, which allows callers to effectively force an action.
 * @returns - {@link RoleCastingResult}
 * @throws {VivRoleCastingError} If the initiator role is not precast.
 * @throws {VivRoleCastingError} If the initiator role is precast with someone other than the initiator at hand.
 */
export async function targetAction(
    actionDefinition: ActionDefinition,
    precastBindings: RoleBindings,
    initiatorLevelCache: InitiatorLevelCache,
    impetus: ActionTargetingEventImpetus = ActionTargetingEventImpetus.General,
    suppressConditions?: boolean
): Promise<RoleCastingResult> {
    // Record the targeting attempt, as applicable
    await recordTargetingAttempt(actionDefinition);
    // Emit a targeting-started event, as applicable
    const initiatorID = initiatorLevelCache.initiatorData.id;
    emitActionTargetingEvent({
        status: TargetingEventStatus.Started,
        impetus,
        action: actionDefinition.name,
        initiator: initiatorID
    });
    // Ensure that the correct initiator has been precast
    if (!precastBindings[actionDefinition.initiator]?.length) {
        throw new VivRoleCastingError(
            "Attempt to target action without precast initiator role",
            actionDefinition,
            actionDefinition.initiator,
            { precastBindings }
        );
    } else if (precastBindings[actionDefinition.initiator][0] !== initiatorID) {
        throw new VivRoleCastingError(
            "Attempt to target action by character who is not the precast initiator",
            actionDefinition,
            actionDefinition.initiator,
            { precastBindings, initiatorAtHand: initiatorID }
        );
    }
    // Attempt to cast the roles, and return the result. Note that this will also entail testing the
    // action's global conditions. If the `bindings` property in the result is `null`, we explored
    // the space of all possible bindings for this action, to no avail.
    const roleCastingResult = await castRoles(
        actionDefinition,
        precastBindings,
        null,
        initiatorLevelCache,
        suppressConditions
    );
    // Emit a targeting-succeeded or targeting-failed event, as applicable
    emitActionTargetingEvent({
        impetus,
        status: roleCastingResult.bindings ? TargetingEventStatus.Succeeded : TargetingEventStatus.Failed,
        action: actionDefinition.name,
        initiator: initiatorID
    });
    return roleCastingResult;
}

/**
 * Targets the given action selector on behalf of the given character, returning a result if an
 * action is successfully targeted at any point in the process.
 *
 * An action selector specifies candidates to target in an order that is derived according to the selector's
 * sort policy. The candidates may be actions or other action selectors, and targeting for the selector
 * succeeds upon the successful targeting of any given candidate. As such, successful targeting will
 * always result in an action being performed, even as a selector may target other action selectors.
 *
 * Note that the compiler ensures that there are no cycles among the action selectors defined in a content bundle.
 *
 * @param actionSelectorDefinition - Definition for the action selector to target.
 * @param precastBindings - Partial or complete bindings that at a minimum bind the prospective initiator to the
 *     initiator role in the given action-selector definition. In the case of a queued selector being targeted,
 *     these bindings may also include all other roles, and may in fact be complete -- such "precast" bindings
 *     originate in action-selector definitions and reaction declarations created by Viv authors.
 * @param initiatorLevelCache - An initiator-level cache.
 * @param source - How this action selector entered the targeting pipeline. Defaults to `"general"`.
 * @returns {@link SelectorResult}
 * @throws {VivRoleCastingError} If the initiator role is not precast.
 * @throws {VivRoleCastingError} If the initiator role is precast with someone other than the initiator at hand.
 */
async function targetActionSelector(
    actionSelectorDefinition: ActionSelectorDefinition,
    precastBindings: RoleBindings,
    initiatorLevelCache: InitiatorLevelCache,
    source: ActionTargetingEventImpetus = ActionTargetingEventImpetus.General
): Promise<SelectorResult> {
    // Record the targeting attempt, as applicable
    await recordTargetingAttempt(actionSelectorDefinition);
    // Ensure that the correct initiator has been precast
    if (!precastBindings[actionSelectorDefinition.initiator]?.length) {
        throw new VivRoleCastingError(
            "Attempt to target action selector without precast initiator role",
            actionSelectorDefinition,
            actionSelectorDefinition.initiator,
            { precastBindings }
        );
    } else if (precastBindings[actionSelectorDefinition.initiator][0] !== initiatorLevelCache.initiatorData.id) {
        throw new VivRoleCastingError(
            "Attempt to target action selector by character who is not the precast initiator",
            actionSelectorDefinition,
            actionSelectorDefinition.initiator,
            { precastBindings, initiatorAtHand: initiatorLevelCache.initiatorData.id }
        );
    }
    // Invoke the selector runner to handle the actual targeting
    return await targetSelector(actionSelectorDefinition, precastBindings, initiatorLevelCache, source);
}

/**
 * Performs an action by creating a new action entity and executing all the associated results.
 *
 * @param actionDefinition - Definition for the action that is to be performed.
 * @param initiatorData - Character view for the initiator of the action that is to be performed.
 * @param bindings - The role bindings for the action that is to be performed.
 * @param evaluationContext - The Viv evaluation context in its final state following role casting.
 * @param queuedAction - If applicable, the queued action (or queued action selector) that is now
 *     resulting in the action that is to be performed.
 * @param forcedCauses - If specified, an array containing entity IDs for arbitrary actions that the host application
 *     has indicated as causes of the action that is to be performed. These will have originated in a call to the
 *     action manager's {@link forciblyTargetAction} function.
 * @returns Entity ID for the action that was performed. The action data is persisted via side effects.
 */
async function performAction(
    actionDefinition: ActionDefinition,
    initiatorData: CharacterView,
    bindings: RoleBindings,
    evaluationContext: EvaluationContext,
    queuedAction: QueuedAction | QueuedActionSelector | null = null,
    forcedCauses: UID[] = []
): Promise<UID> {
    // First, request an entity ID for the new action, and then update the bindings and context to include it
    const actionID = queuedAction?.id ?? await GATEWAY.provisionActionID();
    evaluationContext[SpecialRoleName.This] = actionID;
    evaluationContext.__causes__ = [actionID];  // Propagates via reactions into queued actions
    bindings[SpecialRoleName.This] = [actionID];
    // Next, generate any new entities that were cast in roles with `spawn` labels. If applicable,
    // this function will mutate the current bindings in place.
    await spawnEntities(actionDefinition, bindings, evaluationContext);
    // Next, compile all the causes of this action
    const causes = compileActionCauses(actionDefinition, bindings, queuedAction, forcedCauses);
    // Now construct an action record for the chronicle
    const actionData = await constructActionData(
        actionDefinition,
        initiatorData,
        bindings,
        evaluationContext,
        actionID,
        causes
    );
    // Ask the host application to persist the action record in the chronicle. We need to do this prior to
    // executing effects and so forth, because those might mutate the action itself (e.g. `@this.foo = 99`).
    await GATEWAY.saveActionData(actionID, actionData);
    // Update the `caused` and `descendants` properties for all ancestors of this action, as applicable
    for (const directCausalAncestorID of actionData.causes) {
        await GATEWAY.appendActionCaused(directCausalAncestorID, actionID);
    }
    for (const causalAncestorID of actionData.ancestors) {
        await GATEWAY.appendActionDescendants(causalAncestorID, actionID);
    }
    // Execute scratch operations to prepare an environment of local variables, which will be stored in
    // the action record's `scratch` property. This step must come after the action has been inserted
    // into the chronicle, because the scratch operations will mutate the action's persistent data.
    await executeScratchOperations(actionDefinition, evaluationContext);
    // Execute action effects
    await executeEffects(actionDefinition, bindings, evaluationContext);
    // Queue any reactions to this action may trigger
    await triggerReactions(actionDefinition, bindings, evaluationContext);
    // Impose any embargoes declared in the action definition
    await imposeEmbargoes(actionDefinition, actionData);
    // Fill in missing action fields that can only be populated once the action has been inserted into
    // the chronicle, since the Viv expressions that yield the field values may refer to `@this`. This
    // step must be carried out prior to the calls below to knowledge manager functions, since those
    // depend on the action's `tags` field being set already.
    await populateMissingActionFields(actionDefinition, evaluationContext, actionData);
    // Have all the observers of the action (participants and bystanders) remember it
    await formMemories(actionData, evaluationContext);
    // If this action relays knowledge about any past actions, the knowledge manager will form and/or update memories
    // of those past actions for all observers (participants and bystanders) of the one at hand. In the case of a
    // character learning about a relayed action for the first time, that action's effects and reactions will also
    // be handled, with the character learning about being cast in the special `hearer` role.
    await processRelayedActions(actionData);
    // If this was a queued action, dequeue it now and update its status
    if (queuedAction) {
        await removeFromActionQueue(queuedAction, true);
        // If the queued action has repeat logic, consider re-queueing it
        const repeatLogicFired =
            queuedAction.repeatLogic
            && queuedAction.repeatLogic.remainingInstances > 0
            && await repeatConditionsHold(queuedAction.repeatLogic);
        if (repeatLogicFired) {
            await requeueAction(queuedAction);
        }
    }
    // Finally, return the entity ID for the new action
    return actionID;
}

/**
 * Requests entity construction for all `spawn` roles in the given action definition, and mutates
 * the given bindings and evaluation context in place so that any new entities are included.
 *
 * Entity construction for a given spawn role is carried out by the host application via a call
 * to a {@link CustomFunction} that is specified in the role definition.
 *
 * @param actionDefinition - Definition for the action that is to be performed.
 * @param bindings - The role bindings for the action that is to be performed.
 * @param evaluationContext - The Viv evaluation context in its final state following role casting.
 * @return Nothing. All new entities are created via side effects and the bindings and evaluation
 *     context are mutated in place.
 * @throws {VivInternalError} If the spawn role has anything but `{min: 1, max: 1}` (defensive guard).
 * @throws {VivRoleCastingError} If the spawn function does not return an entity ID.
 */
async function spawnEntities(
    actionDefinition: ActionDefinition,
    bindings: RoleBindings,
    evaluationContext: EvaluationContext,
): Promise<void> {
    for (const [roleName, roleDefinition] of Object.entries(actionDefinition.roles)) {
        // If this isn't a `spawn` role, move on
        if (!roleDefinition.spawnFunction) {
            continue;
        }
        // If the role has anything but `{min: 1, max: 1}`, throw an error now
        if (roleDefinition.min !== 1 || roleDefinition.max !== 1) {
            throw new VivInternalError("Bad spawn role: min and/or max do not equal 1");
        }
        // Evaluate the expression specifying the entity recipe
        const newEntityID = await interpretExpression(roleDefinition.spawnFunction, evaluationContext);
        if (!isString(newEntityID) || !(await GATEWAY.isEntityID(newEntityID))) {
            throw new VivRoleCastingError(
                "Spawn function did not return entity ID",
                actionDefinition,
                roleName,
                { spawnFunctionReturnValue: newEntityID }
            );
        }
        // Add the new entity in the bindings by mutating them in place
        bindings[roleName] ??= [];
        bindings[roleName].push(newEntityID);
        // Update the evaluation context by mutating it in place as well. Note that just above
        // we already confirmed that the `spawn` role is parameterized to `{min: 1, max: 1}`.
        evaluationContext[roleName] = newEntityID;
    }
}

/**
 * Returns an array containing entity IDs for all actions that are deemed to have caused the one
 * that is about to be performed.
 *
 * In my PhD thesis, I argued for the importance of recording causal links between events in a computer
 * simulation *as they occur* -- a task I called *causal bookkeeping*. In Viv, there are five kinds of
 * circumstances that can lead to a causal link being recorded between actions:
 *
 * 1. If an action A casts another (past) action P in one of its roles, P is recorded as a cause
 *    of A. Causal ancestors of this type are compiled in this function.
 *
 * 2. If an action A triggers a reaction R that is ultimately performed, A is recorded as a cause
 *    of R. Causal ancestors of this type are stored in the `queuedAction` data.
 *
 * 3. If an action A relays knowledge about a past action P, and if a character's processing of P
 *    via A triggers a reaction R that is ultimately performed, A is recorded as a cause of R (in
 *    addition to P, per #2). Causal ancestors of this type are stored in the `queuedAction` data.
 *
 * 4. If an action A leads a character to inspect an item that inscribes knowledge about a past action
 *    P, and if a character's processing of P via A triggers a reaction R that is ultimately performed,
 *    A is recorded as a cause of R (in addition to P, per #2). Causal ancestors of this type are stored
 *    in the `queuedAction` data.
 *
 * 5. If the host application has forced an action via the action manager's {@link forciblyTargetAction}
 *    function, and in doing so has asserted arbitrary causes by some project-dependent determination, those
 *    arbitrary causes will be recorded. Such causes are passed in here as the `forcedCauses` argument.
 *
 * @param actionDefinition - Definition for the action that is to be performed.
 * @param bindings - The role bindings for the action that is to be performed.
 * @param queuedAction - If applicable, the queued action (or queued action selector) that is now resulting
 *     in the action about to be performed.
 * @param forcedCauses - If specified, an array containing entity IDs for arbitrary actions that the target
 *     application has indicated as causes of the action about to be performed. These will have originated
 *     in a call to the action manager's {@link forciblyTargetAction} function.
 * @returns An array containing entity IDs for all actions that are deemed to have caused the one
 *     that is about to be performed.
 */
function compileActionCauses(
    actionDefinition: ActionDefinition,
    bindings: RoleBindings,
    queuedAction: QueuedAction | QueuedActionSelector | null,
    forcedCauses: UID[]
): UID[] {
    // First, add in all entities in the bindings that are actions
    const causes: UID[] = [];
    for (const roleName in actionDefinition.roles) {
        if (actionDefinition.roles[roleName].entityType === RoleEntityType.Action) {
            const boundActionIDs = (bindings[roleName] ?? []) as UID[];
            causes.push(...boundActionIDs);
        }
    }
    // If applicable, add in any causes that are included in the queued action
    if (queuedAction) {
        causes.push(...queuedAction.causes);
    }
    // Add in any forced causes originated in a request by the host application
    // to force a particular action to occur with a particular set of bindings.
    causes.push(...forcedCauses);
    // Finally, deduplicate and return the result
    return deduplicate<UID>(causes);
}

/**
 * Returns an action view containing data describing an action that is being performed.
 *
 * @param actionDefinition - Definition for the action that is to be performed.
 * @param initiatorData - Character view for the initiator of the action that is to be performed.
 * @param bindings - The role bindings for the action that is to be performed.
 * @param evaluationContext - The Viv evaluation context in its final state following role casting.
 * @param actionID - Entity ID for the action.
 * @param causes - Array containing entity IDs for all actions that directly caused the one that is being performed.
 * @returns An action view.
 * @throws {VivExecutionError} If the action importance expression evaluates to a non-numeric value.
 */
async function constructActionData(
    actionDefinition: ActionDefinition,
    initiatorData: CharacterView,
    bindings: RoleBindings,
    evaluationContext: EvaluationContext,
    actionID: UID,
    causes: UID[],
): Promise<ActionView> {
    const importance = await interpretExpression(actionDefinition.importance, evaluationContext);
    if (!isNumber(importance)) {
        throw new VivExecutionError(
            `Importance for action '${actionDefinition.name}' evaluated to non-numeric value`,
            { importanceExpression: actionDefinition.importance, evaluatedImportance: importance }
        );
    }
    const ancestors = new Set([...causes]);
    for (const directAncestorID of causes) {
        const furtherAncestorIDs = await GATEWAY.getActionAncestors(directAncestorID);
        for (const ancestorID of furtherAncestorIDs) {
            ancestors.add(ancestorID);
        }
    }
    const relayedActions: ActionView["relayedActions"] = [];
    const partners: ActionView["partners"] = [];
    const recipients: ActionView["recipients"] = [];
    const bystanders: ActionView["bystanders"] = [];
    for (const [roleName, roleDefinition] of Object.entries(actionDefinition.roles)) {
        if (roleDefinition.entityType === RoleEntityType.Action) {
            relayedActions.push(...bindings[roleName] as UID[]);
        } else if (roleDefinition.participationMode === RoleParticipationMode.Partner) {
            partners.push(...bindings[roleName] as UID[]);
        } else if (roleDefinition.participationMode === RoleParticipationMode.Recipient) {
            recipients.push(...bindings[roleName] as UID[]);
        } else if (roleDefinition.participationMode === RoleParticipationMode.Bystander) {
            bystanders.push(...bindings[roleName] as UID[]);
        }
    }
    const active = [initiatorData.id].concat(partners).concat(recipients);
    const present = active.concat(bystanders);
    let timeOfDay: TimeOfDay | null = null;
    if (GATEWAY.getCurrentTimeOfDay) {
        timeOfDay = await GATEWAY.getCurrentTimeOfDay();
    }
    // Construct an action view for the action
    const actionView: ActionView = {
        entityType: EntityType.Action,
        id: actionID,
        name: actionDefinition.name,
        gloss: null,  // Set later on, if specified
        report: null,  // Set later on, if specified
        importance,
        tags: [],  // Set later on, if specified
        bindings: clone<RoleBindings>(bindings),
        location: initiatorData.location as UID,
        timestamp: await GATEWAY.getCurrentTimestamp(),
        timeOfDay,
        causes,
        caused: [],  // Grows as direct causal descendants are performed
        ancestors: [...ancestors],
        descendants: [],  // Grows as causal descendants are performed
        relayedActions,
        initiator: initiatorData.id,
        active,
        present,
        partners,
        recipients,
        bystanders,
        scratch: {},  // This will be populated via `executeScratchOperations()`
    };
    // Return the action view
    return actionView;
}

/**
 * Executes the scratch operations for the given action.
 *
 * In Viv parlance, the *scratch operations* for an action are an ordered sequence of Viv expressions that mutate
 * the `scratch` object property of an action record, namely by asserting local variables that are stored in the
 * top level of the `scratch` object. Viv authors can refer to such variables using the `$var` notation, where
 * `$` is just syntactic sugar for `@this.scratch.`. The scratch environment also persists in the action record,
 * which allows authors to reference variables that may be attached to past actions.
 *
 * @param actionDefinition - Definition for the action at hand.
 * @param evaluationContext - The Viv evaluation context in its final state following role casting.
 * @returns Nothing. The results are persisted via side effects.
 */
async function executeScratchOperations(
    actionDefinition: ActionDefinition,
    evaluationContext: EvaluationContext
): Promise<void> {
    const scratchOperations = actionDefinition.scratch;
    for (const scratchOperation of scratchOperations) {
        await interpretExpression(scratchOperation, evaluationContext);
    }
}

/**
 * Executes effects for the given action.
 *
 * An action's effects are defined by arbitrary Viv expressions that may cause updates to the state of the
 * storyworld in the host application. Note that this function will only execute effects referencing
 * bound roles, meaning it will ignore effects referencing optional roles that were not cast.
 *
 * Note that this function is also called for any *relayed* actions, meaning past actions
 * about which the one being performed relays knowledge.
 *
 * @param actionDefinition - Definition for the action whose effects are to be executed.
 * @param bindings - Bindings for the action whose effects are to be executed.
 * @param evaluationContext - A Viv evaluation context.
 * @param postHoc - Whether we're executing effects for a secondhand recipient of knowledge of an action that
 *     has already occurred, in which case we'll only execute effects referencing the special `hearer` role.
 * @returns Nothing. The results are persisted via side effects.
 */
export async function executeEffects(
    actionDefinition: ActionDefinition,
    bindings: RoleBindings,
    evaluationContext: EvaluationContext,
    postHoc = false
): Promise<void> {
    // Isolate the effects to execute. If we're executing effects for a secondhand recipient of knowledge
    // of this action, we'll only execute effects that explicitly reference the special `hearer` role.
    let effectsToExecute = actionDefinition.effects;
    if (postHoc) {
        effectsToExecute = actionDefinition.effects.filter(
            effect => effect.references.includes(SpecialRoleName.Hearer)
        );
    }
    // Remove any of the isolated effects that reference an optional role that wasn't cast
    const allRoleNames = Object.keys(actionDefinition.roles).concat(SpecialRoleName.Hearer);
    for (const roleName of allRoleNames) {
        const applicableHearerRole = roleName === SpecialRoleName.Hearer && postHoc;
        if (!applicableHearerRole) {
            if (!bindings[roleName]?.length) {
                effectsToExecute = effectsToExecute.filter(effect => !effect.references.includes(roleName));
            }
        }
    }
    // Execute each of the effects in turn
    for (const effect of effectsToExecute) {
        await interpretExpression(effect.body, evaluationContext);
    }
}

/**
 * Trigger reactions for the given action, as applicable.
 *
 * Note that this function is also called for any *relayed* actions, meaning past actions
 * about which the one being performed relays knowledge.
 *
 * @param actionDefinition - Definition for the action whose reactions are to be triggered.
 * @param bindings - Bindings for the action whose reactions are to be triggered.
 * @param evaluationContext - A Viv evaluation context.
 * @param postHoc - Whether we're triggering reactions for a secondhand recipient of knowledge of an action that
 *     has already occurred, in which case we'll only trigger reactions referencing the special `hearer` role.
 * @returns Nothing. Any triggered reactions will be queued via the interpreter invoking the planner's
 *     {@link insertIntoActionQueue} function in turn.
 */
export async function triggerReactions(
    actionDefinition: ActionDefinition,
    bindings: RoleBindings,
    evaluationContext: EvaluationContext,
    postHoc = false
): Promise<void> {
    // Isolate the reactions to consider
    let reactionsToConsider = actionDefinition.reactions;
    if (postHoc) {
        // If we're triggering reactions for a secondhand recipient of knowledge of this action,
        // we'll only consider ones that explicitly reference the `hearer` role.
        reactionsToConsider = actionDefinition.reactions.filter(
            reaction => reaction.references.includes(SpecialRoleName.Hearer)
        );
    }
    // Remove any of the isolated reactions that reference an optional role that wasn't cast
    const allRoleNames = Object.keys(actionDefinition.roles).concat(SpecialRoleName.Hearer);
    for (const roleName of allRoleNames) {
        const applicableHearerRole = roleName === SpecialRoleName.Hearer && postHoc;
        if (!applicableHearerRole) {
            if (!bindings[roleName]?.length) {
                reactionsToConsider = reactionsToConsider.filter(reaction => !reaction.references.includes(roleName));
            }
        }
    }
    // Trigger the reactions. We can do this simply by evaluating the body of the reaction, because doing so
    // will cause Viv to ask the action manager to queue the corresponding reaction.
    for (const reaction of reactionsToConsider) {
        await interpretExpression(reaction.body, evaluationContext);
    }
}

/**
 * Imposes any embargoes that are declared in the definition for the given action.
 *
 * @param actionDefinition - Definition for the action that is to be performed.
 * @param actionView - Action view for the action that is being performed.
 * @returns Nothing. The embargoes are asserted via side effects.
 */
async function imposeEmbargoes(actionDefinition: ActionDefinition, actionView: ActionView): Promise<void> {
    for (const embargoDeclaration of actionDefinition.embargoes) {
        // Compute the embargo expiration timestamp
        let expiration: ActiveEmbargo["expiration"] = null;
        if (!embargoDeclaration.permanent) {
            expiration = groundRelativePointInTime(actionView.timestamp, embargoDeclaration.period as TimeDelta);
        }
        // Compute the embargo prohibited bindings
        let bindings: ActiveEmbargo["bindings"] = null;
        if (embargoDeclaration.roles) {
            bindings = {};
            for (const roleName of embargoDeclaration.roles) {
                bindings[roleName] = actionView.bindings[roleName] ? [...actionView.bindings[roleName]] : [];
            }
        }
        // Package up the embargo data
        const embargoData: ActiveEmbargo = {
            id: randomID(),
            actionName: actionView.name,
            location: embargoDeclaration.here ? actionView.location : null,
            expiration,
            bindings
        };
        // Record the embargo
        const vivInternalState = await GATEWAY.getVivInternalState();
        vivInternalState.actionEmbargoes[actionView.name] ??= [];
        vivInternalState.actionEmbargoes[actionView.name].push(embargoData);
        await GATEWAY.saveVivInternalState(vivInternalState);
    }
}

/**
 * Fills in various fields in the action record that can only be populated once the action has
 * been persisted in the host application.
 *
 * These fields cannot be populated right away because the Viv expressions that derive their values
 * may reference the action itself, via the special `@this` role.
 *
 * @param actionDefinition - Definition for the action that is to be performed.
 * @param evaluationContext - The Viv evaluation context in its final state following role casting.
 * @param actionView - Action view for the action that is being performed.
 * @returns Nothing. The results are persisted via side effects.
 */
async function populateMissingActionFields(
    actionDefinition: ActionDefinition,
    evaluationContext: EvaluationContext,
    actionView: ActionView,
): Promise<void> {
    // Set the `tags` field
    const tags = await interpretExpression(actionDefinition.tags, evaluationContext) as string[];
    if (tags.length) {
        actionView.tags = tags;
    }
    // Set the `gloss` field, as applicable
    if (actionDefinition.gloss) {
        actionView.gloss = await interpretExpression(actionDefinition.gloss, evaluationContext) as string;
    }
    // Set the `report` field, as applicable
    if (actionDefinition.report) {
        actionView.report = await interpretExpression(actionDefinition.report, evaluationContext) as string;
    }
    // Persist the updates
    await GATEWAY.saveActionData(actionView.id, actionView);
}

/**
 * Forces targeting of the given action with the given precast bindings.
 *
 * This function is the internal implementation for the public API function {@link attemptActionAPI}. As such,
 * it is not invoked internally by other runtime code, because it is only intended to be invoked externally,
 * by a consumer of the Viv runtime -- i.e., by a host application using the runtime API.
 *
 * @param actionDefinition - Definition for the action to forcibly target.
 * @param initiatorID - If supplied, the entity ID for the character who will attempt this action. If no
 *     initiator is supplied, all the characters in the world will be shuffled, and the action will be
 *     attempted with each in turn.
 * @param precastBindings - Partial or complete bindings for the given action.
 * @param forcedCauses - An array optionally containing entity IDs for arbitrary actions that
 *     the host application has indicated as causes of the action to forcibly target.
 * @param suppressConditions - Whether to ignore action's conditions during targeting.
 */
export async function forciblyTargetAction(
    actionDefinition: ActionDefinition,
    initiatorID: UID | null,
    precastBindings: RoleBindings,
    forcedCauses: UID[],
    suppressConditions: boolean,
): Promise<UID | null> {
    // Prepare a pool of potential initiators
    let initiatorPool: UID[];
    if (initiatorID) {
        initiatorPool = [initiatorID];
    } else {
        initiatorPool = await GATEWAY.getEntityIDs(EntityType.Character);
        shuffle<UID>(initiatorPool);
    }
    // For each initiator in the pool, attempt the action
    for (const candidateInitiatorID of initiatorPool) {
        // Retrieve initiator data
        const initiatorData = await getCharacterData(candidateInitiatorID);
        // Prepare an initiator-level cache, which will cache data frequently required
        // during action selection for a given initiator.
        const initiatorLevelCache = await prepareInitiatorLevelCache(initiatorData);
        // Target the action with the given initiator and precast bindings
        const roleCastingResult = await targetAction(
            actionDefinition,
            {...precastBindings, [actionDefinition.initiator]: [candidateInitiatorID]},
            initiatorLevelCache,
            ActionTargetingEventImpetus.Forced,
            suppressConditions
        );
        // If targeting succeeded, perform the action and return its entity ID
        if (roleCastingResult.bindings) {
            const actionID = await performAction(
                actionDefinition,
                initiatorData,
                roleCastingResult.bindings,
                roleCastingResult.evaluationContext,
                null,
                forcedCauses
            );
            return actionID;
        }
    }
    // If we get to here, action targeting failed, and we need to return `null` to cue as much
    return null;
}
