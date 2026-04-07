import type {
    ActionName,
    PlanName, PlanPhaseName,
    QueryName,
    RoleName,
    SelectorName,
    SiftingPatternName,
    TropeName
} from "../content-bundle/types";
import type { DiegeticTimestamp, UID } from "../adapter/types";
import type { PlanPhaseReactionWindowOperator } from "../planner";
import type { ActionTargetingEventImpetus, PlanExecutionEventType, RoleCastingBacktrackReason, TargetingEventStatus } from "./constants";

/**
 * Watchlists containing debugging information about a set of constructs that the host
 * application's Viv adapter has identified for watching.
 *
 * @category Other
 */
export interface VivInternalStateDebuggingWatchlists {
    /**
     * A mapping from the name of a watched action to debugging information for the action.
     */
    readonly actions: Record<ActionName, WatchedConstructDebuggingState>;
    /**
     * A mapping from the name of a watched action selector to debugging information for the selector.
     */
    readonly actionSelectors: Record<SelectorName, WatchedConstructDebuggingState>;
    /**
     * A mapping from the name of a watched plan to debugging information for the plan.
     */
    readonly plans: Record<PlanName, WatchedConstructDebuggingState>;
    /**
     * A mapping from the name of a watched plan selector to debugging information for the selector.
     */
    readonly planSelectors: Record<SelectorName, WatchedConstructDebuggingState>;
    /**
     * A mapping from the name of a watched query to debugging information for the query.
     */
    readonly queries: Record<QueryName, WatchedConstructDebuggingState>;
    /**
     * A mapping from the name of a watched sifting pattern to debugging information for the pattern.
     */
    readonly siftingPatterns: Record<SiftingPatternName, WatchedConstructDebuggingState>;
    /**
     * A mapping from the name of a watched trope to debugging information for the trope.
     */
    readonly tropes: Record<TropeName, WatchedConstructDebuggingState>;
}

/**
 * Debugging information for a watched construct, capturing information about attempts to target it.
 *
 * This information can be used to investigate why a construct has not been successfully targeted,
 * especially if this is due to something like a mistyped condition.
 *
 * @category Other
 */
export interface WatchedConstructDebuggingState {
    /**
     * The number of times this construct was targeted during the debugging window.
     */
    targetingAttempts: number;
    /**
     * A mapping from role name to the number of attempts to cast that role during the debugging window.
     */
    castingAttempts: Record<RoleName, number>;
    /**
     * A mapping from role name to counts for each of the possible backtracking reasons,
     * where the counts apply to attempts to cast this role during the debugging window.
     */
    backtrackingReasons: Record<RoleName, BacktrackingReasonCounts>;
    /**
     * An object recording for a given condition its number of successes
     * and failures (across tests of the condition).
     */
    conditionTestResults: Record<string, ConditionResultCounts>;
}

/**
 * A mapping from a reason for backtracking to a count indicating the number of times
 * that reason applied during the debugging window.
 *
 * @category Other
 */
export type BacktrackingReasonCounts = {
    /**
     * The number of times this particular backtracking reason has occurred.
     */
    [K in RoleCastingBacktrackReason]?: number;
};

/**
 * An object recording for a given condition its number of successes
 * and failures (across tests of the condition).
 *
 * @category Other
 */
export interface ConditionResultCounts {
    /**
     * The original source code for this condition.
     */
    condition: string;
    /**
     * The number of times this condition succeeded.
     */
    successes: number;
    /**
     * The number of times this condition failed.
     */
    failures: number;
}

/**
 * A structured event emitted during action targeting to provide real-time
 * observability into the action-selection process.
 *
 * These events are emitted via the optional {@link HostApplicationAdapterObservabilityCallbacks.onActionTargetingEvent}
 * callback on the adapter's debugging settings.
 *
 * @category Debugging
 */
export interface ActionTargetingEvent {
    /**
     * The targeting status associated with this event.
     */
    readonly status: TargetingEventStatus;
    /**
     * The impetus for this instance of action targeting.
     */
    readonly impetus: ActionTargetingEventImpetus;
    /**
     * The name of the action being targeted, as defined in the content bundle.
     */
    readonly action: ActionName;
    /**
     * The entity ID of the character for whom this action is being targeted.
     */
    readonly initiator: UID;
}

/**
 * A plan-execution event, as issued to the {@link HostApplicationAdapterObservabilityCallbacks.onPlanExecutionEvent}
 * observability callback.
 *
 * @category Debugging
 */
export type PlanExecutionEvent =
    | PlanLaunchedEvent
    | PlanPhaseAdvancedEvent
    | PlanBlockedOnWaitEvent
    | PlanBlockedOnReactionWindowEvent
    | PlanSucceededEvent
    | PlanFailedEvent;

/**
 * Base shape shared by all plan-execution events.
 *
 * @category Debugging
 */
export interface PlanExecutionEventBase {
    /**
     * The unique identifier for the plan state associated with this event.
     */
    readonly planID: UID;
    /**
     * The name of the plan, as defined in the content bundle.
     */
    readonly plan: PlanName;
}

/**
 * Emitted when a plan is launched, i.e., when role casting succeeds and plan execution begins.
 *
 * Note: A {@link PlanPhaseAdvancedEvent} for the initial phase will immediately follow this event.
 *
 * @category Debugging
 */
export interface PlanLaunchedEvent extends PlanExecutionEventBase {
    /**
     * Discriminator for a plan-launched event.
     */
    readonly type: PlanExecutionEventType.Launched;
}

/**
 * Emitted when plan execution advances into a new phase.
 *
 * @category Debugging
 */
export interface PlanPhaseAdvancedEvent extends PlanExecutionEventBase {
    /**
     * Discriminator for a phase-advanced event.
     */
    readonly type: PlanExecutionEventType.PhaseAdvanced;
    /**
     * The name of the phase into which execution is advancing.
     */
    readonly phase: PlanPhaseName;
}

/**
 * Emitted when plan execution blocks on a wait instruction, pausing until a deadline
 * elapses or optional resume conditions are satisfied.
 *
 * @category Debugging
 */
export interface PlanBlockedOnWaitEvent extends PlanExecutionEventBase {
    /**
     * Discriminator for a blocked-on-wait event.
     */
    readonly type: PlanExecutionEventType.BlockedOnWait;
    /**
     * The name of the phase at hand (in which the plan is blocked).
     */
    readonly phase: PlanPhaseName;
    /**
     * The diegetic timestamp at which the wait will expire, allowing execution to resume.
     */
    readonly deadline: DiegeticTimestamp;
}

/**
 * Emitted when plan execution blocks on a reaction window, waiting for queued constructs
 * to resolve according to the window's operator.
 *
 * If the window becomes unsatisfiable (e.g., all constructs fail under an `any` operator),
 * the plan will fail and a {@link PlanFailedEvent} will be emitted.
 *
 * @category Debugging
 */
export interface PlanBlockedOnReactionWindowEvent extends PlanExecutionEventBase {
    /**
     * Discriminator for a blocked-on-reaction-window event.
     */
    readonly type: PlanExecutionEventType.BlockedOnReactionWindow;
    /**
     * The name of the phase in which the plan is blocked.
     */
    readonly phase: PlanPhaseName;
    /**
     * The operator governing the reaction window.
     */
    readonly operator: PlanPhaseReactionWindowOperator;
    /**
     * UIDs for the constructs queued during this reaction window, over which the operator holds.
     */
    readonly queuedConstructs: readonly UID[];
}

/**
 * Emitted when a plan completes successfully.
 *
 * @category Debugging
 */
export interface PlanSucceededEvent extends PlanExecutionEventBase {
    /**
     * Discriminator for a plan-succeeded event.
     */
    readonly type: PlanExecutionEventType.Succeeded;
    /**
     * The name of the phase in which the plan succeeded.
     */
    readonly phase: PlanPhaseName;
}

/**
 * Emitted when a plan fails, either due to a `fail` instruction or an unsatisfiable reaction window.
 *
 * @category Debugging
 */
export interface PlanFailedEvent extends PlanExecutionEventBase {
    /**
     * Discriminator for a plan-failed event.
     */
    readonly type: PlanExecutionEventType.Failed;
    /**
     * The name of the phase in which the plan failed.
     */
    readonly phase: PlanPhaseName;
}
