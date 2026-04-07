/*!
 * @license Viv License Agreement (c) 2025-2026 Sifty LLC. All rights reserved.
 * For license terms, see `LICENSE.txt` or visit https://sifty.studio/licensing.
 */

/**
 * @packageDocumentation The JavaScript runtime for the Viv engine for emergent narrative in
 * games and simulations.
 */

// Public functions
export {
    attemptActionAPI as attemptAction,
    constructSiftingMatchDiagramAPI as constructSiftingMatchDiagram,
    constructTreeDiagramAPI as constructTreeDiagram,
    fadeCharacterMemoriesAPI as fadeCharacterMemories,
    getDebuggingDataAPI as getDebuggingData,
    getSchemaVersionAPI as getSchemaVersion,
    initializeVivRuntimeAPI as initializeVivRuntime,
    queuePlanAPI as queuePlan,
    runSearchQueryAPI as runSearchQuery,
    runSiftingPatternAPI as runSiftingPattern,
    selectActionAPI as selectAction,
    tickPlannerAPI as tickPlanner,
    vivRuntimeIsInitializedAPI as vivRuntimeIsInitialized
} from "./api";

// Custom errors
export {
    VivError,
    VivExecutionError,
    VivInternalError,
    VivInterpreterError,
    VivNotInitializedError,
    VivRoleCastingError,
    VivValidationError,
    ValidationErrorSubject
} from "./errors";

// DTO types for API functions
export type {
    AttemptActionArgs,
    AttemptActionResult,
    GetSchemaVersionResult,
    GetDebuggingDataResult,
    InitializeVivRuntimeArgs,
    InitializeVivRuntimeResult,
    QueuePlanArgs,
    QueuePlanResult,
    ConstructSiftingMatchDiagramArgs,
    ConstructSiftingMatchDiagramResult,
    ConstructTreeDiagramArgs,
    ConstructTreeDiagramResult,
    RunSearchQueryArgs,
    RunSearchQueryResult,
    RunSiftingPatternArgs,
    RunSiftingPatternResult,
    SelectActionArgs,
    SelectActionResult,
    VivRuntimeIsInitializedResult
} from "./api/dto";

// Public types
export type { ActiveEmbargo } from "./action-manager/types";
export type {
    ActionQueue,
    ActionView,
    AsyncOrSync,
    CustomFunction,
    CustomFunctionName,
    CharacterMemories,
    CharacterView,
    DiegeticTimestamp,
    EntityView,
    HostApplicationAdapter,
    HostApplicationAdapterConfig,
    HostApplicationAdapterConstructWatchlists,
    HostApplicationAdapterDebuggingSettings,
    HostApplicationAdapterFastPaths,
    HostApplicationAdapterObservabilityCallbacks,
    ItemView,
    LocationView,
    PlanQueue,
    QueuedConstructStatuses,
    TimeOfDay,
    UID,
    VivInternalState,
    VivInternalStateDebugging
} from "./adapter/types";
export type {
    ActionName,
    PlanName,
    QueryName,
    RoleName,
    SelectorName,
    SiftingPatternName,
    TropeName
} from "./content-bundle/types";
export type {
    ActionTargetingEvent,
    BacktrackingReasonCounts,
    ConditionResultCounts,
    PlanBlockedOnReactionWindowEvent,
    PlanBlockedOnWaitEvent,
    PlanExecutionEvent,
    PlanFailedEvent,
    PlanLaunchedEvent,
    PlanPhaseAdvancedEvent,
    PlanSucceededEvent,
    VivInternalStateDebuggingWatchlists,
    WatchedConstructDebuggingState
} from "./debugger/types";
export type { EnumName } from "./dsl/types";
export type { ExpressionValue } from "./interpreter/types";
export type { CharacterMemory } from "./knowledge-manager/types";
export type {
    QueuedAction,
    QueuedActionSelector,
    QueuedPlan,
    QueuedPlanSelector
} from "./queue-manager/types";
export type { PlanState } from "./planner/types";
export type { RoleBindings, RoleCandidate, SymbolRoleBinding } from "./role-caster/types";
export type { SiftingMatch } from "./story-sifter/types";

// Public runtime constants
export { EntityType } from "./adapter";
export {
    ActionTargetingEventImpetus,
    PlanExecutionEventType,
    RoleCastingBacktrackReason,
    TargetingEventStatus
} from "./debugger";
export { PlanPhaseReactionWindowOperator } from "./planner";
export { QueuedConstructDiscriminator, QueuedConstructStatus } from "./queue-manager";
export { VivErrorName } from "./errors";
