import type { DiegeticTimestamp, TimeOfDay, UID } from "../adapter/types";
import type { ActionName, PlanName, SelectorName } from "../content-bundle/types";
import type { Expression, SetPredicate } from "../dsl/types";
import type { EvaluationContext } from "../interpreter/types";
import type { RoleBindings } from "../role-caster/types";
import type { QueuedConstructDiscriminator } from "./constants";

/**
 * A construct that is queued for future targeting.
 *
 * The following constructs may be queued: actions, plans, action selectors, and plan selectors.
 *
 * Queued actions and action selectors are stored in a queue associated with the prospective initiator,
 * while queued plans and plan selectors are stored in a FIFO queue associated with the planner. While
 * a character can only perform at most one queued action on a given {@link selectActionAPI} call, the
 * planner greedily pursues all active plans on each {@link tickPlannerAPI} call. Ultimately, plans cause
 * constructs to be queued, resulting eventually in actions to be queued, where they are governed by
 * the aforementioned {@link selectActionAPI} policy. As such, greedily pursuing plans doesn't end up
 * causing more actions to occur, but rather causes more actions to be queued.
 *
 * Note: there is no guarantee that a queued action will actually be performed, since the author can
 * constrain performance in various ways, including via expiration and abandonment criteria.
 */
export type QueuedConstruct = QueuedAction | QueuedActionSelector | QueuedPlan | QueuedPlanSelector;

/**
 * Base data for all queued constructs.
 */
export interface QueuedConstructBase {
    /**
     * Discriminator indicating the type of queued construct.
     */
    readonly type: QueuedConstructDiscriminator;
    /**
     * The name of the queued construct.
     */
    readonly constructName: ActionName | PlanName | SelectorName;
    /**
     * A unique identifier for the queued construct, provisioned by the host application via a call to
     * the {@link HostApplicationAdapter.provisionActionID} adapter function. Should an actual action be performed or an actual
     * plan be launched, the resulting action or plan will take on this UID.
     */
    readonly id: UID;
    /**
     * Whether the queued construct is to be marked urgent.
     *
     * For a queued action or action selector, this will cause it to be placed in the urgent heap of the
     * associated initiator's action queue. For a queued plan or plan selector, this will cause the resulting
     * plan to be immediately targeted (and potentially launched) upon being queued. This allows authors to
     * specify complex action machinery that is intended to play out on the same timestep as precipitating action.
     */
    readonly urgent: boolean;
    /**
     * A mapping from a role name to an array of entity IDs for entities precast in that role.
     */
    readonly precastBindings: RoleBindings;
    /**
     * Entity IDs for all the actions recorded as causes of the queued construct.
     *
     * Whenever an action is ultimately performed by virtue of the queued construct -- even if transitively,
     * e.g., via a plan queueing a plan queueing a plan that queues an action that is performed -- these causes
     * will be recorded for the action as a matter of causal bookkeeping. This enables story sifting later on.
     *
     * Note that the causes here may contain multiple entries, which occurs when an action relays knowledge about
     * the action to which the reaction was actually attached. To illustrate, consider the case of a reaction R
     * that is attached to an action A1, which ultimately causes a queued action to be performed, which we will
     * call Q. Now let's further say that Q's initiator, C, learned about A1, the direct cause of Q, via another
     * action, A2, which relays knowledge about A1 -- i.e., A2 casts A1 in one of its roles. In this case, when
     * C experiences A2, as a matter of course C will be cast in A1's special `hearer` role, with A1's effects
     * and reactions being handled for C accordingly. It is through this process that Q, a reaction on A1,
     * would be queued for C as a result of C learning about A1 via A2. In this case, both A1 and A2 would be
     * included in the causes for Q, with A1 being the zeroth entry (see the note on this just below). Note
     * that if A1 relays knowledge about an earlier action, A0, we will not evaluate A0's reactions upon C
     * learning about A1 via A2. We only follow a single chain link for effect and reaction handling, since
     * knowledge propagation would get out of hand otherwise.
     *
     * Because reaction declarations can be wrapped in conditionals and loops, the only way for the causes
     * to make their way into the queued construct is insertion into the evaluation context, which we do
     * via the special `__causes__` field in the evaluation context.
     *
     * Some more notes: no duplicates will appear here, and the zeroth entry will always be the action that
     * directly triggered queuing. We place this one first in order to ground temporal constraints on reactions,
     * which may be anchored in the timestamp of the action that triggered the reaction.
     *
     * If a plan triggered queueing, the action that queued the plan -- or the action that queued the plan
     * that queued the plan, etc. -- will be the zeroth entry.
     */
    readonly causes: UID[];
    /**
     * Abandonment conditions for the queued construct.
     *
     * If *all* these hold at any point at which the queued construct is being targeted, it will be dequeued.
     */
    abandonmentConditions?: QueuedConstructAbandonmentConditions;
    /**
     * Repeat logic for the queued construct.
     */
    repeatLogic?: QueuedConstructRepeatLogic;
}

/**
 * Abandonment conditions for a queued construct.
 *
 * If these all hold at any point at which the queued construct is being targeted, it will be dequeued.
 */
export interface QueuedConstructAbandonmentConditions {
    /**
     * An array of Viv expressions such that, if all of them hold (i.e. evaluate to
     * truthy values), the queued construct will be abandoned (i.e., dequeued).
     */
    readonly conditions: Expression[];
    /**
     * The evaluation context to use when evaluating the abandonment conditions.
     *
     * At the time a reaction declaration was executed to queue the construct, this will have been dehydrated,
     * meaning all entity data will have been converted into entity IDs. This allows the planner to pull the
     * latest entity state at the time of condition evaluation. Note that we have to attach this context here
     * in order to preserve any local variables that may be pertinent, which is a common case that results
     * from an author queueing reactions within a loop. If we were to instead store the entity ID for
     * the cause of this reaction, and then reconstruct a context from its bindings, we would lose this
     * local variable.
     *
     * This and {@link QueuedConstructRepeatLogic.context} are the only cases where local variables
     * persist beyond action performance.
     */
    readonly context: EvaluationContext;
}

/**
 * Repeat logic for a queued construct.
 *
 * If the queued construct succeeds, meaning the associated action is performed or the plan resolves
 * successfully, the construct will be re-queued provided all conditions hold and its instances have
 * not all been exhausted.
 */
export interface QueuedConstructRepeatLogic {
    /**
     * An array of Viv expressions such that, if all of them hold (i.e., evaluate to truthy values)
     * after the queued construct succeeds, a copy of the construct will be re-queued.
     */
    readonly conditions: Expression[];
    /**
     * The evaluation context to use when evaluating the repeat conditions.
     *
     * At the time a reaction declaration was executed to queue the construct, this will have been dehydrated,
     * meaning all entity data will have been converted into entity IDs. This allows the runtime to pull the
     * latest entity state at the time of condition evaluation.
     *
     * This and {@link QueuedConstructAbandonmentConditions.context} are the only cases where local
     * variables persist beyond action performance.
     */
    readonly context: EvaluationContext;
    /**
     * The remaining number of times this construct may be re-queued upon successful performance/execution.
     *
     * This value is decremented on each instance of re-queueing, and when it reaches zero,
     * no further re-queueing will occur.
     */
    readonly remainingInstances: number;
}

/**
 * Base data shared by queued actions and queued action selectors.
 */
export interface QueuedActionBase extends QueuedConstructBase {
    /**
     * Entity ID for the prospective initiator of the action (selector).
     */
    readonly initiator: UID;
    /**
     * A numeric priority value that governs insertion into the initiator's queue. If the queued action
     * is also marked `urgent`, this will be used as a secondary ordering key inside the urgency bucket.
     * Higher values indicating a higher priority, and thus an earlier position in the queue.
     */
    readonly priority: number;
    /**
     * If present, predicates that will constrain where the eventual action may be performed.
     */
    location?: SetPredicate[];
    /**
     * Temporal constraints on when exactly the eventual action may be performed. The constraints may specify a
     * time-of-day window and/or a point-in-time window, with story time being the domain in each case. Note
     * that the interpreter is tasked with grounding constraints into actual story time, as needed, by making
     * use of the host application's Viv adapter.
     */
    time?: QueuedActionTemporalConstraints;
}

/**
 * An action that is queued for potential future performance by a given character.
 *
 * Concretely, an action is queued when a reaction declaration for another action (or a plan) is acted
 * upon. Queueing entails insertion into the prospective initiator's action queue, and ultimately there
 * is no guarantee the action will actually be performed, since the author can constrain performance in
 * various ways, including via expiration and abandonment criteria.
 */
export interface QueuedAction extends QueuedActionBase {
    /**
     * Discriminator for a queued action.
     */
    readonly type: QueuedConstructDiscriminator.Action;
    /**
     * The name of the queued action.
     */
    readonly constructName: ActionName;
}

/**
 * An action selector that is queued for future consideration on behalf of a given character.
 *
 * Concretely, an action selector is queued when a reaction declaration for another action (or a plan)
 * is acted upon. Queueing entails insertion into the prospective initiator's action queue. When the
 * selector is considered, it will succeed (and be dequeued) if it causes one of its associated actions
 * to successfully be performed. Ultimately there is no guarantee that any action will actually be performed
 * by virtue of the queued action selector, since the author can constrain performance in various ways,
 * including via expiration and abandonment criteria.
 */
export interface QueuedActionSelector extends QueuedActionBase {
    /**
     * Discriminator for a queued action selector.
     */
    readonly type: QueuedConstructDiscriminator.ActionSelector;
    /**
     * The name of the queued action selector.
     */
    readonly constructName: SelectorName;
}

/**
 * A plan that is queued for potential future launching by the planner.
 *
 * Concretely, a plan is queued when a reaction declaration for an action (or another plan) is acted upon.
 * Queueing entails appending to the global plan queue, which is not sorted in any priority order. Instead,
 * the planner greedily pursues all queued plans (and plan selectors) each tick. If a plan is successfully
 * targeted, because its required roles can be cast, then it will be launched. Ultimately there is no
 * guarantee that the plan will actually be launched, since the author can constrain launching in
 * various ways, including via expiration and abandonment criteria.
 */
export interface QueuedPlan extends QueuedConstructBase {
    /**
     * Discriminator for a queued plan.
     */
    readonly type: QueuedConstructDiscriminator.Plan;
    /**
     * The name of the queued plan.
     */
    readonly constructName: PlanName;
}

/**
 * A plan selector that is queued for future consideration by the planner.
 *
 * Concretely, a plan selector is queued when a reaction declaration for an action (or a plan) is acted upon.
 * Queueing entails appending the plan selector to the global plan queue, which is not sorted in any priority
 * order. Instead, the planner greedily pursues all queued plans (and plan selectors) each tick. A plan selector
 * is successfully targeted when its required roles can be cast and it successfully launches one of its associated
 * plans. Ultimately there is no guarantee that any plan will actually be launched, since the author can constrain
 * launching in various ways, including via expiration and abandonment criteria.
 */
export interface QueuedPlanSelector extends QueuedConstructBase {
    /**
     * Discriminator for a queued plan selector.
     */
    readonly type: QueuedConstructDiscriminator.PlanSelector;
    /**
     * The name of the queued plan selector.
     */
    readonly constructName: SelectorName;
}

/**
 * Temporal constraints on a queued action (selector) that have already been grounded to story time
 * in the running instance of the host application at hand.
 */
export interface QueuedActionTemporalConstraints {
    /**
     * A temporal constraint specifying an acceptable range that begins and/or ends with a certain
     * point in story time, such that the eventual action may only be performed during that window.
     */
    readonly timeFrame: QueuedActionTemporalConstraintTimeFrame | null;
    /**
     * A temporal constraint specifying an acceptable range that begins and/or ends with a certain
     * time of day, such that the eventual action may only be performed during that window. There's
     * no need to ground these expressions in story time, so we can reuse the content types here.
     */
    readonly timeOfDay: QueuedActionTemporalConstraintTimeOfDay | null;
}

/**
 * A temporal constraint on a queued action (selector) specifying an acceptable range that begins
 * and/or ends with a certain point in story time, such that the eventual action may only be
 * performed during that window.
 */
export interface QueuedActionTemporalConstraintTimeFrame {
    /**
     * If present, the earliest point in story time at which the eventual action may be performed.
     */
    readonly open: DiegeticTimestamp | null;
    /**
     * If present, the latest point in story time at which the eventual action may be performed. Should
     * this timestamp be eclipsed, the planner will automatically dequeue the action.
     */
    readonly close: DiegeticTimestamp | null;
}

/**
 * A temporal constraint on a queued action (selector) specifying an acceptable range that begins
 * and/or ends with a certain  point in story time, such that the eventual action may only be
 * performed during that window.
 */
export interface QueuedActionTemporalConstraintTimeOfDay {
    /**
     * If present, the earliest time of day at which the queued action may be performed.
     */
    readonly open: TimeOfDay | null;
    /**
     * If present, the latest time of day at which the queued action may be performed.
     */
    readonly close: TimeOfDay | null;
}
