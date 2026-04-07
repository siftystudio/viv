import type { EntityType } from "../adapter";
import type {
    ActionQueue,
    ActionView,
    CustomFunction,
    CustomFunctionName,
    DiegeticTimestamp,
    EntityView,
    PlanQueue,
    QueuedConstructStatuses,
    HostApplicationAdapter,
    HostApplicationAdapterConfig,
    HostApplicationAdapterDebuggingSettings,
    HostApplicationAdapterFastPaths,
    TimeOfDay,
    UID,
    VivInternalState
} from "../adapter/types";
import type { EnumName } from "../dsl/types";
import type { CharacterMemory } from "../knowledge-manager/types";
import type { PlanState } from "../planner/types";
import type { QueuedConstructStatus } from "../queue-manager";

/**
 * A Viv adapter gateway, which the runtime uses to make use of functionality implemented
 * via the host application's Viv adapter.
 *
 * The canonical gateway functions are in some cases simple async wrappers around functions
 * implemented in the host application's Viv adapter, and in other cases they implement the
 * semantics described on {@link HostApplicationAdapterFastPaths}, using the provided fast
 * paths when present and otherwise falling back to the naive procedures described there.
 */
export interface HostApplicationGateway {
    /**
     * Adapter configuration as normalized by the gateway, with default values supplied
     * for any elided optional parameters in {@link HostApplicationAdapter.config}.
     */
    readonly config: Required<HostApplicationAdapterConfig>;
    /**
     * Gateway wrapper around {@link HostApplicationAdapter.enums}.
     */
    readonly enums: Record<EnumName, number | string>;
    /**
     * Gateway wrapper around {@link HostApplicationAdapter.functions}.
     */
    readonly functions: Record<CustomFunctionName, CustomFunction>;
    /**
     * Gateway wrapper around {@link HostApplicationAdapter.getEntityView}.
     */
    readonly getEntityView: (entityID: UID) => Promise<EntityView>;
    /**
     * Gateway wrapper around {@link HostApplicationAdapter.saveActionData}.
     */
    readonly saveActionData: (actionID: UID, actionData: ActionView) => Promise<void>;
    /**
     * Gateway wrapper around {@link HostApplicationAdapter.saveCharacterMemory}.
     */
    readonly saveCharacterMemory: (characterID: UID, actionID: UID, memory: CharacterMemory) => Promise<void>;
    /**
     * Gateway wrapper around {@link HostApplicationAdapter.saveItemInscriptions}.
     */
    readonly saveItemInscriptions: (itemID: UID, inscriptions: UID[]) => Promise<void>;
    /**
     * Gateway wrapper around {@link HostApplicationAdapter.getVivInternalState}, but with some extra logic
     * for initializing Viv internal state. As such, it has a different signature (never returns `null`).
     */
    readonly getVivInternalState: () => Promise<VivInternalState>;
    /**
     * Gateway wrapper around {@link HostApplicationAdapter.saveVivInternalState}.
     */
    readonly saveVivInternalState: (vivInternalState: VivInternalState) => Promise<void>;
    /**
     * Gateway wrapper around {@link HostApplicationAdapter.getEntityIDs}.
     */
    readonly getEntityIDs: (entityType: EntityType, locationID?: UID) => Promise<UID[]>;
    /**
     * Gateway wrapper around {@link HostApplicationAdapter.provisionActionID}.
     */
    readonly provisionActionID: () => Promise<UID>;
    /**
     * Gateway wrapper around {@link HostApplicationAdapter.getCurrentTimestamp}.
     */
    readonly getCurrentTimestamp: () => Promise<DiegeticTimestamp>;
    /**
     * Gateway wrapper around {@link HostApplicationAdapter.getEntityLabel}.
     */
    readonly getEntityLabel: (entityID: UID) => Promise<string>;
    /**
     * Gateway wrapper around {@link HostApplicationAdapter.updateEntityProperty}.
     */
    readonly updateEntityProperty: (entityID: UID, propertyPath: (string | number)[], value: unknown) => Promise<void>;
    /**
     * Gateway wrapper around {@link HostApplicationAdapter.getCurrentTimeOfDay}, if that
     * function is implemented, else `null`.
     */
    readonly getCurrentTimeOfDay: (() => Promise<TimeOfDay>) | null;
    /**
     * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.isEntityID}.
     */
    readonly isEntityID: (potentialEntityID: string) => Promise<boolean>;
    /**
     * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getEntityProperty}.
     */
    readonly getEntityProperty: (entityID: UID, propertyPath: (string | number)[]) => Promise<any>;
    /**
     * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.appendEntityProperty}.
     */
    readonly appendEntityProperty: (
        entityID: UID,
        propertyPath: (string | number)[],
        value: unknown,
        dedupe: boolean
    ) => Promise<void>;
    /**
     * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getEntityType}.
     */
    readonly getEntityType: (entityID: UID) => Promise<EntityType>;
    /**
     * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getEntityLocation}.
     */
    readonly getEntityLocation: (entityID: UID) => Promise<UID>;
    /**
     * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getActionQueue}.
     */
    readonly getActionQueue: (characterID: UID) => Promise<ActionQueue>;
    /**
     * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.saveActionQueue}.
     */
    readonly saveActionQueue: (characterID: UID, updatedActionQueue: ActionQueue) => Promise<void>;
    /**
     * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getPlanQueue}.
     */
    readonly getPlanQueue: () => Promise<PlanQueue>;
    /**
     * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.savePlanQueue}.
     */
    readonly savePlanQueue: (updatedPlanQueue: PlanQueue) => Promise<void>;
    /**
     * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getAllPlanStates}.
     */
    readonly getAllPlanStates: () => Promise<Record<UID, PlanState>>;
    /**
     * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getPlanState}.
     */
    readonly getPlanState: (planID: UID) => Promise<PlanState>;
    /**
     * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.savePlanState}.
     */
    readonly savePlanState: (planID: UID, updatedPlanState: PlanState) => Promise<void>;
    /**
     * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.deletePlanState}.
     */
    readonly deletePlanState: (planID: UID) => Promise<void>;
    /**
     * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getQueuedConstructStatuses}.
     */
    readonly getQueuedConstructStatuses: () => Promise<QueuedConstructStatuses>;
    /**
     * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.saveQueuedConstructStatus}.
     */
    readonly saveQueuedConstructStatus: (
        queuedConstructID: UID,
        queuedConstructStatus: QueuedConstructStatus
    ) => Promise<void>;
    /**
     * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getActionAncestors}.
     */
    readonly getActionAncestors: (actionID: UID) => Promise<UID[]>;
    /**
     * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getActionDescendants}.
     */
    readonly getActionDescendants: (actionID: UID) => Promise<UID[]>;
    /**
     * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.appendActionCaused}.
     */
    readonly appendActionCaused: (parentID: UID, childID: UID) => Promise<void>;
    /**
     * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.appendActionDescendants}.
     */
    readonly appendActionDescendants: (ancestorID: UID, descendantID: UID) => Promise<void>;
    /**
     * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getCharacterMemory}.
     */
    readonly getCharacterMemory: (characterID: UID, actionID: UID) => Promise<CharacterMemory | null>;
    /**
     * Gateway operation corresponding to {@link HostApplicationAdapterFastPaths.getItemInscriptions}.
     */
    readonly getItemInscriptions: (itemID: UID) => Promise<UID[]>;
    /**
     * If supplied, settings activating debugging facilities of the Viv runtime, else `null`.
     */
    readonly debug: HostApplicationAdapterDebuggingSettings | null;
}
