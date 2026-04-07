import get from "lodash/get";

import type {
    ActionQueue,
    AsyncOrSync,
    PlanQueue,
    QueuedConstructStatuses,
    HostApplicationAdapter,
    HostApplicationAdapterConfig,
    UID,
    VivInternalState,
} from "../adapter/types";
import type { WatchedConstructDebuggingState } from "../debugger/types";
import type { CharacterMemory } from "../knowledge-manager/types";
import type { PlanState } from "../planner/types";
import type { HostApplicationGateway } from "./types";
import { EntityType } from "../adapter";
import { VivExecutionError, VivInternalError } from "../errors";
import type { QueuedConstructStatus } from "../queue-manager";
import { isArray } from "../utils";
import { GATEWAY_CONFIG_DEFAULTS } from "./config";

/**
 * The gateway to the Viv adapter for the host application at hand.
 */
export let GATEWAY: HostApplicationGateway;

/**
 * A handle on the Viv adapter for the host application at hand, which is used by
 * the special gateway operations defined below.
 */
let ADAPTER: HostApplicationAdapter;

/**
 * Creates (and exposes) the gateway to the Viv adapter for the host application at hand, making it accessible
 * to the runtime. The gateway populates config defaults and exposes gateway operations that are as optimized
 * as possible given the fast paths included in the Viv adapter.
 *
 * @param adapter - The Viv adapter for the host application at hand, which will already have been validated.
 * @returns Nothing. Mutates {@link ADAPTER} and {@link GATEWAY} in place.
 */
export function createVivAdapterGateway(adapter: HostApplicationAdapter): void {
    ADAPTER = adapter;
    const config = prepareGatewayConfig(adapter);
    const gateway: HostApplicationGateway = {
        config,
        enums: adapter.enums ?? {},
        functions: adapter.functions ?? {},
        getEntityView: promisify(adapter.getEntityView),
        saveActionData: promisify(adapter.saveActionData),
        saveCharacterMemory: promisify(adapter.saveCharacterMemory),
        saveItemInscriptions: promisify(adapter.saveItemInscriptions),
        saveVivInternalState: promisify(adapter.saveVivInternalState),
        getEntityIDs: promisify(adapter.getEntityIDs),
        provisionActionID: promisify(adapter.provisionActionID),
        getCurrentTimestamp: promisify(adapter.getCurrentTimestamp),
        getEntityLabel: promisify(adapter.getEntityLabel),
        getCurrentTimeOfDay: adapter.getCurrentTimeOfDay ? promisify(adapter.getCurrentTimeOfDay) : null,
        getVivInternalState,
        updateEntityProperty,
        getEntityProperty,
        isEntityID,
        getEntityType,
        getEntityLocation,
        getActionQueue,
        saveActionQueue,
        getPlanQueue,
        savePlanQueue,
        getAllPlanStates,
        getPlanState,
        savePlanState,
        deletePlanState,
        getQueuedConstructStatuses,
        saveQueuedConstructStatus,
        getActionAncestors,
        getActionDescendants,
        getCharacterMemory,
        getItemInscriptions,
        appendEntityProperty,
        appendActionCaused,
        appendActionDescendants,
        debug: adapter.debug ?? null,
    };
    GATEWAY = gateway;
}

/**
 * Returns a prepared configuration setting for Viv's gateway to the host application at hand.
 *
 * @param adapter - The Viv adapter for the host application at hand, which will already have been validated.
 * @returns A prepared configuration setting for Viv's gateway to the host application at hand.
 */
function prepareGatewayConfig(adapter: HostApplicationAdapter): Required<HostApplicationAdapterConfig> {
    const loopMaxIterations = adapter.config?.loopMaxIterations ?? GATEWAY_CONFIG_DEFAULTS.loopMaxIterations;
    const memoryMaxSalience = adapter.config?.memoryMaxSalience ?? GATEWAY_CONFIG_DEFAULTS.memoryMaxSalience;
    const memoryRetentionMonthlyMultiplier =
        adapter.config?.memoryRetentionMonthlyMultiplier ?? GATEWAY_CONFIG_DEFAULTS.memoryRetentionMonthlyMultiplier;
    const memoryForgettingSalienceThreshold =
        adapter.config?.memoryForgettingSalienceThreshold ?? GATEWAY_CONFIG_DEFAULTS.memoryForgettingSalienceThreshold;
    const gatewayConfig: Required<HostApplicationAdapterConfig> = {
        loopMaxIterations,
        memoryMaxSalience,
        memoryRetentionMonthlyMultiplier,
        memoryForgettingSalienceThreshold,
    };
    return gatewayConfig;
}

/**
 * Returns the persisted internal state for the Viv runtime, if it exists, else newly initialized Viv internal state.
 *
 * If there is not yet any internal state, it will be initialized here (and set via an adapter call).
 *
 * @returns The persisted Viv internal state, if it exists, else newly initialized Viv internal state.
 */
async function getVivInternalState(): Promise<VivInternalState> {
    let vivInternalState = await ADAPTER.getVivInternalState();
    if (vivInternalState === null) {
        vivInternalState = initializeVivInternalState();
        await ADAPTER.saveVivInternalState(vivInternalState);
    }
    return vivInternalState;
}

/**
 * Returns initialized Viv internal state.
 *
 * @returns Initialized Viv internal state.
 */
function initializeVivInternalState(): VivInternalState {
    const vivInternalState: VivInternalState = {
        actionQueues: {},
        planQueue: [],
        activePlans: {},
        queuedConstructStatuses: {},
        actionEmbargoes: {},
        lastMemoryDecayTimestamp: null,
    };
    if (ADAPTER.debug?.watchlists) {
        vivInternalState.debugging = {
            watchlists: {
                actions: {},
                actionSelectors: {},
                plans: {},
                planSelectors: {},
                queries: {},
                siftingPatterns: {},
                tropes: {},
            }
        };
        const initialWatchedConstructState = () => {
            const watchedConstructState: WatchedConstructDebuggingState = {
                targetingAttempts: 0,
                castingAttempts: {},
                backtrackingReasons: {},
                conditionTestResults: {}
            };
            return watchedConstructState;
        }
        for (const actionName of ADAPTER.debug.watchlists.actions ?? []) {
            vivInternalState.debugging.watchlists!.actions[actionName] = initialWatchedConstructState();
        }
        for (const actionSelectorName of ADAPTER.debug.watchlists.actionSelectors ?? []) {
            vivInternalState.debugging.watchlists!.actionSelectors[actionSelectorName] = initialWatchedConstructState();
        }
        for (const planName of ADAPTER.debug.watchlists.plans ?? []) {
            vivInternalState.debugging.watchlists!.plans[planName] = initialWatchedConstructState();
        }
        for (const planSelectorName of ADAPTER.debug.watchlists.planSelectors ?? []) {
            vivInternalState.debugging.watchlists!.planSelectors[planSelectorName] = initialWatchedConstructState();
        }
        for (const queryName of ADAPTER.debug.watchlists.queries ?? []) {
            vivInternalState.debugging.watchlists!.queries[queryName] = initialWatchedConstructState();
        }
        for (const siftingPatternName of ADAPTER.debug.watchlists.siftingPatterns ?? []) {
            vivInternalState.debugging.watchlists!.siftingPatterns[siftingPatternName] = initialWatchedConstructState();
        }
        for (const tropeName of ADAPTER.debug.watchlists.tropes ?? []) {
            vivInternalState.debugging.watchlists!.tropes[tropeName] = initialWatchedConstructState();
        }
    }
    return vivInternalState;
}

/**
 * Gateway operation corresponding to {@link HostApplicationAdapter.updateEntityProperty}.
 *
 * @throws {VivInternalError} If the adapter does not implement {@link HostApplicationAdapter.updateEntityProperty},
 *     but this should have already been confirmed during adapter registration (defensive guard, as such).
 */
async function updateEntityProperty(
    entityID: UID,
    propertyPath: (string | number)[],
    value: unknown
): Promise<void> {
    // If we get to here without the adapter supplying this
    if (!ADAPTER.updateEntityProperty) {
        throw new VivInternalError(
            "The adapter does not supply an 'updateEntityProperty()' implementation, "
            + "but an assignment attempted to update entity data"
        );
    }
    await ADAPTER.updateEntityProperty(entityID, propertyPath, value);
}

/**
 * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.isEntityID}.
 */
async function isEntityID(potentialEntityID: string): Promise<boolean> {
    if (ADAPTER.fastPaths?.isEntityID) {
        return ADAPTER.fastPaths.isEntityID(potentialEntityID);
    }
    try {
        await getEntityType(potentialEntityID);
    } catch {
        return false;
    }
    return true;
}

/**
 * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getEntityType}.
 */
async function getEntityType(entityID: UID): Promise<EntityType> {
    if (ADAPTER.fastPaths?.getEntityType) {
        return ADAPTER.fastPaths.getEntityType(entityID);
    }
    return await getEntityProperty(entityID, ["entityType"]);
}

/**
 * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getEntityLocation}.
 */
async function getEntityLocation(entityID: UID): Promise<UID> {
    if (ADAPTER.fastPaths?.getEntityLocation) {
        return ADAPTER.fastPaths.getEntityLocation(entityID);
    }
    return await getEntityProperty(entityID, ["location"]);
}

/**
 * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getActionQueue}.
 */
async function getActionQueue(characterID: UID): Promise<ActionQueue> {
    if (ADAPTER.fastPaths?.getActionQueue) {
        return ADAPTER.fastPaths.getActionQueue(characterID);
    }
    const vivInternalState = await getVivInternalState();
    return vivInternalState.actionQueues[characterID] ?? [];
}

/**
 * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.saveActionQueue}.
 */
async function saveActionQueue(
    characterID: UID,
    updatedActionQueue: ActionQueue
): Promise<void> {
    if (ADAPTER.fastPaths?.saveActionQueue) {
        await ADAPTER.fastPaths.saveActionQueue(characterID, updatedActionQueue);
        return;
    }
    const vivInternalState = await getVivInternalState();
    vivInternalState.actionQueues[characterID] = updatedActionQueue;
    await ADAPTER.saveVivInternalState(vivInternalState);
}

/**
 * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getPlanQueue}.
 */
async function getPlanQueue(): Promise<PlanQueue> {
    if (ADAPTER.fastPaths?.getPlanQueue) {
        return ADAPTER.fastPaths.getPlanQueue();
    }
    const vivInternalState = await getVivInternalState();
    return vivInternalState.planQueue;
}

/**
 * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.savePlanQueue}.
 */
async function savePlanQueue(updatedPlanQueue: PlanQueue): Promise<void> {
    if (ADAPTER.fastPaths?.savePlanQueue) {
        await ADAPTER.fastPaths.savePlanQueue(updatedPlanQueue);
        return;
    }
    const vivInternalState = await getVivInternalState();
    vivInternalState.planQueue = updatedPlanQueue;
    await ADAPTER.saveVivInternalState(vivInternalState);
}

/**
 * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getAllPlanStates}.
 */
async function getAllPlanStates(): Promise<Record<UID, PlanState>> {
    if (ADAPTER.fastPaths?.getAllPlanStates) {
        return ADAPTER.fastPaths.getAllPlanStates();
    }
    const vivInternalState = await getVivInternalState();
    return vivInternalState.activePlans;
}

/**
 * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getPlanState}.
 */
async function getPlanState(planID: UID): Promise<PlanState> {
    if (ADAPTER.fastPaths?.getPlanState) {
        return ADAPTER.fastPaths.getPlanState(planID);
    }
    const vivInternalState = await getVivInternalState();
    return vivInternalState.activePlans[planID];
}

/**
 * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.savePlanState}.
 */
async function savePlanState(planID: UID, updatedPlanState: PlanState): Promise<void> {
    if (ADAPTER.fastPaths?.savePlanState) {
        await ADAPTER.fastPaths.savePlanState(planID, updatedPlanState);
        return;
    }
    const vivInternalState = await getVivInternalState();
    vivInternalState.activePlans[planID] = updatedPlanState;
    await ADAPTER.saveVivInternalState(vivInternalState);
}

/**
 * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.deletePlanState}.
 */
async function deletePlanState(planID: UID): Promise<void> {
    if (ADAPTER.fastPaths?.deletePlanState) {
        await ADAPTER.fastPaths.deletePlanState(planID);
        return;
    }
    const vivInternalState = await getVivInternalState();
    delete vivInternalState.activePlans[planID];
    await ADAPTER.saveVivInternalState(vivInternalState);
}

/**
 * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getQueuedConstructStatuses}.
 */
async function getQueuedConstructStatuses(): Promise<QueuedConstructStatuses> {
    if (ADAPTER.fastPaths?.getQueuedConstructStatuses) {
        return ADAPTER.fastPaths.getQueuedConstructStatuses();
    }
    const vivInternalState = await getVivInternalState();
    return vivInternalState.queuedConstructStatuses;
}

/**
 * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.saveQueuedConstructStatus}.
 */
async function saveQueuedConstructStatus(
    queuedConstructID: UID,
    queuedConstructStatus: QueuedConstructStatus
): Promise<void> {
    if (ADAPTER.fastPaths?.saveQueuedConstructStatus) {
        await ADAPTER.fastPaths.saveQueuedConstructStatus(queuedConstructID, queuedConstructStatus);
        return;
    }
    const vivInternalState = await getVivInternalState();
    vivInternalState.queuedConstructStatuses[queuedConstructID] = queuedConstructStatus;
    await ADAPTER.saveVivInternalState(vivInternalState);
}

/**
 * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getActionAncestors}.
 */
async function getActionAncestors(actionID: UID): Promise<UID[]> {
    if (ADAPTER.fastPaths?.getActionAncestors) {
        return ADAPTER.fastPaths.getActionAncestors(actionID);
    }
    return await getEntityProperty(actionID, ["ancestors"]);
}

/**
 * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getActionDescendants}.
 */
async function getActionDescendants(actionID: UID): Promise<UID[]> {
    if (ADAPTER.fastPaths?.getActionDescendants) {
        return ADAPTER.fastPaths.getActionDescendants(actionID);
    }
    return await getEntityProperty(actionID, ["descendants"]);
}

/**
 * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.appendActionCaused}.
 */
async function appendActionCaused(parentID: UID, childID: UID): Promise<void> {
    if (ADAPTER.fastPaths?.appendActionCaused) {
        await ADAPTER.fastPaths.appendActionCaused(parentID, childID);
        return;
    }
    await appendEntityProperty(parentID, ["caused"], childID, false);
}

/**
 * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.appendActionDescendants}.
 */
async function appendActionDescendants(ancestorID: UID, descendantID: UID): Promise<void> {
    if (ADAPTER.fastPaths?.appendActionDescendants) {
        await ADAPTER.fastPaths.appendActionDescendants(ancestorID, descendantID);
        return;
    }
    await appendEntityProperty(ancestorID, ["descendants"], descendantID, false);
}

/**
 * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getCharacterMemory}.
 */
async function getCharacterMemory(characterID: UID, actionID: UID): Promise<CharacterMemory | null> {
    if (ADAPTER.fastPaths?.getCharacterMemory) {
        return ADAPTER.fastPaths.getCharacterMemory(characterID, actionID);
    }
    const characterMemories = await getEntityProperty(characterID, ["memories"]);
    return characterMemories[actionID] ?? null;
}

/**
 * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getItemInscriptions}.
 */
async function getItemInscriptions(itemID: UID): Promise<UID[]> {
    if (ADAPTER.fastPaths?.getItemInscriptions) {
        return ADAPTER.fastPaths.getItemInscriptions(itemID);
    }
    return await getEntityProperty(itemID, ["inscriptions"]);
}

/**
 * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.appendEntityProperty}.
 *
 * @throws {VivExecutionError} If the property is not an array.
 */
async function appendEntityProperty(
    entityID: UID,
    propertyPath: (string | number)[],
    value: unknown,
    dedupe: boolean
): Promise<void> {
    // If a fast path for this has been supplied, use that now
    if (ADAPTER.fastPaths?.appendEntityProperty) {
        await ADAPTER.fastPaths.appendEntityProperty(entityID, propertyPath, value, dedupe);
        return;
    }
    // Otherwise, attempt to pull the current property value. If it doesn't exist,
    // we can set this property to a singleton array containing the value to append.
    let entityPropertyValue: any;
    try {
        entityPropertyValue = await getEntityProperty(entityID, propertyPath);
    } catch {
        await updateEntityProperty(entityID, propertyPath, [value]);
        return;
    }
    // If it does exist, confirm it's an array
    if (!isArray(entityPropertyValue)) {
        throw new VivExecutionError(
            `Cannot append to property for entity with ID '${entityID}' (property exists but is not array)`,
            { propertyPath, entityPropertyValue }
        );
    }
    // If the array already contains the value, and we're supposed to deduplicate, simply return now
    if (dedupe && entityPropertyValue.includes(value)) {
        return;
    }
    // If we get to here, we need to actually carry out a typical append operation, which we'll
    // do by mutating the property value in hand and then updating it via an adapter call.
    entityPropertyValue.push(value);
    await updateEntityProperty(entityID, propertyPath, entityPropertyValue);
}

/**
 * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getEntityProperty}.
 *
 * @throws {VivExecutionError} If the property is undefined.
 */
async function getEntityProperty(entityID: UID, propertyPath: (string | number)[]): Promise<any> {
    if (ADAPTER.fastPaths?.getEntityProperty) {
        return ADAPTER.fastPaths.getEntityProperty(entityID, propertyPath);
    }
    const entityView = await ADAPTER.getEntityView(entityID);
    const entityPropertyValue = get(entityView, propertyPath);
    if (entityPropertyValue === undefined) {
        throw new VivExecutionError(
            `Cannot retrieve undefined property for entity with ID '${entityID}'`,
            { propertyPath }
        );
    }
    return entityPropertyValue;
}

/**
 * A helper function that converts a potentially synchronous adapter function into an asynchronous function.
 *
 * This allows adapter writers to use synchronous functions as they wish, while still ensuring that the
 * runtime is always dealing with asynchronous gateway functions, which is desirable for type reasons.
 *
 * @param adapterFunction - The potentially synchronous adapter function to render asynchronous.
 * @returns An asynchronous function.
 */
function promisify<TArgs extends unknown[], TResult>(
    adapterFunction: (...args: TArgs) => AsyncOrSync<TResult>
): (...args: TArgs) => Promise<TResult> {
    return (...args: TArgs): Promise<TResult> => Promise.resolve(adapterFunction(...args));
}
