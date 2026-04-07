import type { UID } from "../adapter/types";
import type { PlanDefinition, PlanName } from "../content-bundle/types";
import type { EvaluationContext, ExpressionValue } from "../interpreter/types";
import type {
    PlanInstruction,
    PlanInstructionAddress,
    PlanInstructionJump,
    PlanInstructionJumpIfFalse,
    PlanInstructionLoopInit,
    PlanInstructionLoopNext,
    PlanInstructionReactionQueue,
    PlanInstructionReactionWindowClose,
    PlanInstructionWaitEnd,
    PlanInstructionWaitStart,
    PlanLoopFrame,
    PlanState
} from "./types";
import type { QueuedPlan, QueuedPlanSelector } from "../queue-manager/types";
import type { RoleBindings } from "../role-caster/types";
import { PlanExecutionEventType, emitPlanExecutionEvent } from "../debugger";
import { VivExecutionError, VivInternalError } from "../errors";
import { GATEWAY } from "../gateway";
import { dehydrateEvaluationContext, dehydrateExpressionValue, interpretExpression, isTruthy } from "../interpreter";
import {
    QueuedConstructDiscriminator,
    QueuedConstructStatus,
    abandonmentConditionsHold,
    requeuePlan,
    removeFromPlanQueue,
    repeatConditionsHold
} from "../queue-manager";
import { castRoles } from "../role-caster";
import { targetSelector } from "../selector-runner";
import { clone, getPlanDefinition, getPlanSelectorDefinition, groundRelativePointInTime, isArray } from "../utils";
import { PlanInstructionDiscriminator, PlanPhaseReactionWindowOperator } from "./constants";

/**
 * Ticks the planner, causing it to do the following work:
 *
 *  - Target each queued plan (and plan selector) in turn, launching new plans as applicable. Newly
 *    launched plans will immediately be greedily executed to the degree currently possible.
 *
 *  - Resume execution of all other plans that were already active at the beginning of the tick.
 *
 * @returns Nothing. All changes are persisted via side effects.
 * @throws {VivInternalError} If there is an unexpected construct type in the plan queue (defensive guard).
 */
export async function tickPlanner(): Promise<void> {
    // First, grab snapshots of the plan queue and current active plans at the beginning of this tick
    const planQueue = await GATEWAY.getPlanQueue();
    const activePlans = await GATEWAY.getAllPlanStates();
    // Target each queued plan (and plan selector) in turn. If a plan is successfully targeted, it will
    // be launched and then immediately executed to the degree currently possible. In the course of this
    // initial execution, other plans may be queued, but only ones queued via `urgent` reactions will be
    // targeted upon being queued. Again, a plan that is successfully targeted is immediately launched
    // with initial greedy execution.
    for (const queuedPlan of planQueue) {
        switch (queuedPlan.type) {
            case QueuedConstructDiscriminator.Plan:
                await targetQueuedPlan(queuedPlan);
                break;
            case QueuedConstructDiscriminator.PlanSelector:
                await targetQueuedPlanSelector(queuedPlan);
                break;
            default:
                throw new VivInternalError(
                    `Unexpected construct type in plan queue: '${(queuedPlan as any).type}'`
                );
        }
    }
    // Now resume execution of all other plans that were active at the beginning of the tick. We operate
    // over a snapshot here so as to avoid resuming execution of any newly launched plans for which we
    // already carried out initial execution to the degree currently possible. Were we to resume such
    // plans here, we likely wouldn't progress any farther, and it would be fine if we did, except that
    // there would be a cost to re-evaluating the concerns that currently block plan progression. As such,
    // we operate over a snapshot here as a matter of optimization.
    for (const planState of Object.values(activePlans)) {
        await executePlan(planState);
    }
}

/**
 * Targets the given queued plan, launching a new plan state if role casting succeeds.
 *
 * Note that plan launching entails dequeueing the plan and greedily executing it to the degree currently possible.
 *
 * @param queuedPlan - The queued plan to target.
 * @returns Nothing. Any plan state resulting from launching will be persisted via side effects.
 */
export async function targetQueuedPlan(queuedPlan: QueuedPlan): Promise<void> {
    // Abandon targeting and dequeue if the queued plan's abandonment conditions hold
    const mustAbandonQueuedPlan = await abandonmentConditionsHold(queuedPlan);
    if (mustAbandonQueuedPlan) {
        // Permanently dequeue the queued plan, because its abandonment conditions hold, and return now
        await removeFromPlanQueue(queuedPlan, true);
        return;
    }
    // Target the queued plan. If targeting succeeds, the plan will be immediately launched.
    const planDefinition = getPlanDefinition(queuedPlan.constructName);
    // Attempt to cast the roles. If the `bindings` property in the result is `null`, we explored
    // the space of all possible bindings for this plan, to no avail.
    const roleCastingResult = await castRoles(planDefinition, queuedPlan.precastBindings, null);
    // If however targeting was successful, we can now launch the plan. Note that plan launching
    // entails dequeueing the plan and greedily executing it to the degree currently possible.
    if (roleCastingResult.bindings) {
        await launchPlan(planDefinition, roleCastingResult.bindings, roleCastingResult.evaluationContext, queuedPlan);
    }
}

/**
 * Targets the given queued plan selector, launching a new plan state if role casting succeeds
 * for any plan associated with the selector.
 *
 * A plan selector specifies candidates to target in an order that is derived according to the selector's sort
 * policy. The candidates may be plans or other plan selectors, and targeting for the selector succeeds upon
 * the successful targeting of any given candidate. As such, successful targeting will always result in a plan
 * being *launched*, rather than queued, even as a selector may target other plan selectors.
 *
 * Note that the compiler ensures that there are no cycles among the plan selectors defined in a content bundle.
 *
 * @param queuedPlanSelector - The queued plan selector to target.
 * @returns Nothing. Any plan state resulting from launching will be persisted via side effects.
 */
export async function targetQueuedPlanSelector(queuedPlanSelector: QueuedPlanSelector): Promise<void> {
    // Abandon targeting and dequeue if the queued plan selector's abandonment conditions hold
    const mustAbandonQueuedPlan = await abandonmentConditionsHold(queuedPlanSelector);
    if (mustAbandonQueuedPlan) {
        // Permanently dequeue the queued plan selector, because its abandonment conditions hold, and return now
        await removeFromPlanQueue(queuedPlanSelector, true);
        return;
    }
    // Invoke the selector runner to handle the actual targeting
    const planSelectorDefinition = getPlanSelectorDefinition(queuedPlanSelector.constructName);
    const selectorResult = await targetSelector(
        planSelectorDefinition,
        queuedPlanSelector.precastBindings
    );
    // If targeting was successful, launch the resulting plan. Note that this will entail dequeueing the plan.
    if (selectorResult.selectedConstructName) {
        await launchPlan(
            getPlanDefinition(selectorResult.selectedConstructName as PlanName),
            selectorResult.roleCastingResult.bindings,
            selectorResult.roleCastingResult.evaluationContext,
            queuedPlanSelector
        );
    }
}

/**
 * Launches a new plan by initializing its plan state and commencing plan execution.
 *
 * The initial execution of this plan will progress through its phases to the degree that is currently possible,
 * up to reaching a potential terminal state.
 *
 * @param planDefinition - Definition for the plan that is to be launched.
 * @param bindings - The role bindings for the plan that is to be launched.
 * @param evaluationContext - The Viv evaluation context in its final state following role casting.
 * @param queuedPlan - The queued plan (or queued plan selector) that is now resulting in the plan that is being
 *     launched. This parameter is required because plans can only be launched following queueing, as opposed to
 *     actions, which may be performed via general action targeting.
 * @returns Nothing. The plan state for the launched plan will be persisted via side effects.
 */
export async function launchPlan(
    planDefinition: PlanDefinition,
    bindings: RoleBindings,
    evaluationContext: EvaluationContext,
    queuedPlan: QueuedPlan | QueuedPlanSelector
) {
    // Dequeue the queued plan
    await removeFromPlanQueue(queuedPlan);
    // Add the queued plan's causes into the plan evaluation context
    evaluationContext.__causes__ = [...queuedPlan.causes];
    // Initialize the plan state
    const initialPlanState = await initializePlanState(planDefinition, bindings, evaluationContext, queuedPlan);
    // Persist this initial state
    await GATEWAY.savePlanState(queuedPlan.id, initialPlanState);
    // Emit plan-execution events, for observability during debugging, as applicable
    emitPlanExecutionEvent({
        type: PlanExecutionEventType.Launched,
        planID: initialPlanState.id,
        plan: initialPlanState.planName
    });
    emitPlanExecutionEvent({
        type: PlanExecutionEventType.PhaseAdvanced,
        planID: initialPlanState.id,
        plan: initialPlanState.planName,
        phase: initialPlanState.currentPhase
    });
    // Start executing the plan. Any updates will be persisted via side effects downstream.
    await executePlan(initialPlanState);
}

/**
 * Returns an initialized plan state corresponding to the given material.
 *
 * @param planDefinition - Definition for the plan that is to be launched.
 * @param bindings - The role bindings for the plan that is to be launched.
 * @param evaluationContext - The Viv evaluation context in its final state following role casting.
 * @param queuedPlan - The queued plan (or queued plan selector) that is now resulting
 *     in the plan that is being launched.
 * @returns An initialized plan state.
 */
async function initializePlanState(
    planDefinition: PlanDefinition,
    bindings: RoleBindings,
    evaluationContext: EvaluationContext,
    queuedPlan: QueuedPlan | QueuedPlanSelector
): Promise<PlanState> {
    const dehydratedEvaluationContext = await dehydrateEvaluationContext(evaluationContext);
    const initialPlanState: PlanState = {
        id: queuedPlan.id,
        planName: planDefinition.name,
        bindings,
        evaluationContext: dehydratedEvaluationContext,
        currentPhase: planDefinition.initialPhase,
        programCounter: 0,
        loopStack: [],
        reactionWindowQueuedConstructs: null,
        waitDeadline: null,
        resolved: false
    };
    // If the queued plan has repeat logic -- and, more specifically, it has remaining repeat
    // instances -- carry a copy of into the plan state, since we may need to re-queue it
    // upon successful execution of the plan.
    if (queuedPlan.repeatLogic && queuedPlan.repeatLogic.remainingInstances > 0) {
        initialPlanState.sourceQueuedPlan = clone(queuedPlan);
    }
    return initialPlanState;
}

/**
 * Greedily executes the given plan, progressing through its instructions and phases to the degree currently possible.
 *
 * @param planState - Current plan state for the plan being executed.
 * @returns Nothing. State updates and plan resolution are handled via side effects, as applicable.
 * @throws {VivInternalError} If the program counter doesn't properly update (defensive guard).
 * @throws {VivInternalError} If the plan is blocked by a wait instruction, but with no deadline (defensive guard).
 * @throws {VivInternalError} If the plan is blocked by a reaction window, but with
 *     no queued constructs (defensive guard).
 */
async function executePlan(planState: PlanState): Promise<void> {
    // Retrieve the plan definition
    const planDefinition = getPlanDefinition(planState.planName);
    // Begin or resume execution of the plan. We'll be greedy here and proceed to the degree currently possible.
    while (true) {
        // Execute the next instruction. This will step the program counter as needed, such that
        // we have a subsequent instruction ready on the next iteration of this loop.
        const previousPhase = planState.currentPhase;
        const previousProgramCounter = planState.programCounter;
        await executePlanInstruction(planState, planDefinition);
        // If execution of this instruction resolved the plan, we can simply return now, because we
        // will have already deleted this plan state and need to refrain from persisting it again.
        if (planState.resolved) {
            return;
        }
        // If we did not step into a new instruction, we're blocked currently (e.g., by a wait instruction),
        // and thus we need to pause execution at this time.
        if (planState.currentPhase === previousPhase && planState.programCounter === previousProgramCounter) {
            // Before we do pause, let's defend against a non-blocking instruction blocking execution due to a bug
            const blockingInstruction = fetchCurrentPlanInstruction(planState, planDefinition);
            const blockingInstructionIsLegal =
                blockingInstruction.type === PlanInstructionDiscriminator.ReactionWindowClose
                || blockingInstruction.type === PlanInstructionDiscriminator.WaitEnd;
            if (!blockingInstructionIsLegal) {
                throw new VivInternalError("Instruction with non-blocking type left the program counter unchanged");
            }
            // Emit a plan-execution event, for observability during debugging, as applicable
            if (blockingInstruction.type === PlanInstructionDiscriminator.WaitEnd) {
                if (planState.waitDeadline === null) {
                    throw new VivInternalError("Reaction with is blocked on a wait with a deadline of null");
                }
                emitPlanExecutionEvent({
                    type: PlanExecutionEventType.BlockedOnWait,
                    planID: planState.id,
                    plan: planState.planName,
                    phase: planState.currentPhase,
                    deadline: planState.waitDeadline
                });
            } else {
                if (planState.reactionWindowQueuedConstructs === null) {
                    throw new VivInternalError("Reaction window is blocked with no queued constructs");
                }
                emitPlanExecutionEvent({
                    type: PlanExecutionEventType.BlockedOnReactionWindow,
                    planID: planState.id,
                    plan: planState.planName,
                    phase: planState.currentPhase,
                    operator: (blockingInstruction as PlanInstructionReactionWindowClose).operator,
                    queuedConstructs: [...planState.reactionWindowQueuedConstructs]
                });
            }
            // Okay, we're safe to pause execution
            break;
        }
    }
    // Before we go, persist the updated plan state
    await GATEWAY.savePlanState(planState.id, planState);
}

/**
 * Executes the current plan instruction and steps into the next instruction, as needed.
 *
 * Note: This function will mutate the plan state in place, as applicable.
 *
 * @param planState - Current plan state for the plan being executed.
 * @param planDefinition - Definition for the plan being executed.
 * @returns Nothing. The plan state is mutated in place.
 * @throws {VivInternalError} If a plan instruction has an invalid type (defensive guard).
 */
async function executePlanInstruction(
    planState: PlanState,
    planDefinition: PlanDefinition
): Promise<void> {
    // Execute the instruction
    const currentInstruction = fetchCurrentPlanInstruction(planState, planDefinition);
    switch (currentInstruction.type) {
        case PlanInstructionDiscriminator.Advance:
            await executePlanInstructionAdvance(planState, planDefinition);
            break;
        case PlanInstructionDiscriminator.Fail:
            await executePlanInstructionFail(planState);
            break;
        case PlanInstructionDiscriminator.Jump:
            await executePlanInstructionJump(currentInstruction, planState, planDefinition);
            break;
        case PlanInstructionDiscriminator.JumpIfFalse:
            await executePlanInstructionJumpIfFalse(currentInstruction, planState, planDefinition);
            break;
        case PlanInstructionDiscriminator.LoopInit:
            await executePlanInstructionLoopInit(currentInstruction, planState);
            break;
        case PlanInstructionDiscriminator.LoopNext:
            await executePlanInstructionLoopNext(currentInstruction, planState, planDefinition);
            break;
        case PlanInstructionDiscriminator.ReactionQueue:
            await executePlanInstructionReaction(currentInstruction, planState);
            break;
        case PlanInstructionDiscriminator.ReactionWindowClose:
            await executePlanInstructionReactionWindowClose(currentInstruction, planState, planDefinition);
            break;
        case PlanInstructionDiscriminator.ReactionWindowOpen:
            await executePlanInstructionReactionWindowOpen(planState);
            break;
        case PlanInstructionDiscriminator.Succeed:
            await executePlanInstructionSucceed(planState);
            break;
        case PlanInstructionDiscriminator.WaitEnd:
            await executePlanInstructionWaitEnd(currentInstruction, planState, planDefinition);
            break;
        case PlanInstructionDiscriminator.WaitStart:
            await executePlanInstructionWaitStart(currentInstruction, planState);
            break;
        default:
            throw new VivInternalError(`Invalid type for plan instruction: '${(currentInstruction as any).type}`);
    }
    // Step the program counter, as needed
    switch (currentInstruction.type) {
        // For instructions that manually handle stepping the program counter, do nothing more
        case PlanInstructionDiscriminator.Advance:
        case PlanInstructionDiscriminator.Fail:
        case PlanInstructionDiscriminator.Succeed:
        case PlanInstructionDiscriminator.Jump:
        case PlanInstructionDiscriminator.JumpIfFalse:
        case PlanInstructionDiscriminator.LoopNext:
        case PlanInstructionDiscriminator.ReactionWindowClose:
        case PlanInstructionDiscriminator.WaitEnd:
            break;
        // For instructions that unconditionally step into the next instruction, carry out this logic
        case PlanInstructionDiscriminator.LoopInit:
        case PlanInstructionDiscriminator.ReactionQueue:
        case PlanInstructionDiscriminator.ReactionWindowOpen:
        case PlanInstructionDiscriminator.WaitStart:
            await stepPlanProgramCounter(planState, planDefinition);
            break;
        // If we get to here, we likely have a new instruction type that hasn't been added to this switch yet
        default:
            throw new VivInternalError(
                `Plan instructions of type '${(currentInstruction as any).type}' have no designated method `
                + `for stepping into the next instruction`
            );
    }
}

/**
 * Returns the current plan instruction.
 *
 * @param planState - Current plan state for the plan being executed.
 * @param planDefinition - Definition for the plan being executed.
 * @returns The current plan instruction.
 */
function fetchCurrentPlanInstruction(
    planState: PlanState,
    planDefinition: PlanDefinition
): PlanInstruction {
    return planDefinition.phases[planState.currentPhase].tape[planState.programCounter];
}

/**
 * Executes an {@link PlanInstructionAdvance}.
 *
 * This entails advancing to the next plan phase, if there is one, else resolving the plan
 * with a final success status.
 *
 * @param planState - Current plan state for the plan being executed.
 * @param planDefinition - Definition for the plan being executed.
 * @returns Nothing. The plan state is mutated in place.
 */
async function executePlanInstructionAdvance(
    planState: PlanState,
    planDefinition: PlanDefinition
): Promise<void> {
    await advancePlanPhase(planState, planDefinition)
}

/**
 * Executes an {@link PlanInstructionFail}.
 *
 * This entails resolving the plan with a final failure status.
 *
 * @param planState - Current plan state for the plan being executed.
 * @returns Nothing. The plan state is mutated in place.
 */
async function executePlanInstructionFail(planState: PlanState): Promise<void> {
    await resolvePlan(planState, false);
}

/**
 * Executes an {@link PlanInstructionJump}.
 *
 * This entails stepping the program counter to the jump target.
 *
 * @param instruction - A Viv {@link PlanInstructionJump}.
 * @param planState - Current plan state for the plan being executed.
 * @param planDefinition - Definition for the plan being executed.
 * @returns Nothing. The plan state is mutated in place.
 */
async function executePlanInstructionJump(
    instruction: PlanInstructionJump,
    planState: PlanState,
    planDefinition: PlanDefinition
): Promise<void> {
    await stepPlanProgramCounter(planState, planDefinition, instruction.target);
}

/**
 * Executes an {@link PlanInstructionJumpIfFalse}.
 *
 * This entails stepping the program counter to the jump target, if a specific condition
 * does *not* hold, and otherwise stepping to the next instruction.
 *
 * @param instruction - A Viv {@link PlanInstructionJumpIfFalse}.
 * @param planState - Current plan state for the plan being executed.
 * @param planDefinition - Definition for the plan being executed.
 * @returns Nothing. The plan state is mutated in place.
 */
async function executePlanInstructionJumpIfFalse(
    instruction: PlanInstructionJumpIfFalse,
    planState: PlanState,
    planDefinition: PlanDefinition
): Promise<void> {
    const result = await interpretExpression(
        instruction.condition,
        planState.evaluationContext,
        true
    );
    if (!isTruthy(result)) {
        await stepPlanProgramCounter(planState, planDefinition, instruction.target);
    } else {
        await stepPlanProgramCounter(planState, planDefinition);
    }
}

/**
 * Executes an {@link PlanInstructionLoopInit}.
 *
 * This entails evaluating the loop iterable, creating a new loop frame, and pushing this onto the loop-frame stack
 * in the plan state. Note that the loop iterable will never be re-evaluated, which means a loop that takes e.g.
 * 200 story years to complete will still operate over the iterable that was evaluated when it first began.
 *
 * @param instruction - A Viv {@link PlanInstructionLoopInit}.
 * @param planState - Current plan state for the plan being executed.
 * @returns Nothing. The plan state is mutated in place.
 * @throws {VivExecutionError} If the loop iterable does not evaluate to an array.
 */
async function executePlanInstructionLoopInit(
    instruction: PlanInstructionLoopInit,
    planState: PlanState
): Promise<void> {
    // Evaluate the iterable
    const evaluatedIterable = await interpretExpression(instruction.iterable, planState.evaluationContext);
    if (!isArray(evaluatedIterable)) {
        throw new VivExecutionError(
            `Loop iterable in plan '${planState.planName}' did not evaluate to an array`,
            { planID: planState.id, loopInstruction: instruction, evaluatedIterable }
        );
    }
    // Dehydrate the evaluated iterable (we don't want to persist a hydrated iterable in the plan state)
    const dehydratedEvaluatedIterable = await dehydrateExpressionValue(evaluatedIterable);
    // Construct the loop frame
    const loopFrame: PlanLoopFrame = {
        iterable: dehydratedEvaluatedIterable as ExpressionValue[],
        variable: instruction.variable,
        iterationIndex: 0
    };
    // Push the loop frame onto the loop stack
    planState.loopStack.push(loopFrame);
}

/**
 * Executes an {@link PlanInstructionLoopNext}.
 *
 * @param instruction - A Viv {@link PlanInstructionLoopNext}.
 * @param planState - Current plan state for the plan being executed.
 * @param planDefinition - Definition for the plan being executed.
 * @returns Nothing. The plan state is mutated in place.
 */
async function executePlanInstructionLoopNext(
    instruction: PlanInstructionLoopNext,
    planState: PlanState,
    planDefinition: PlanDefinition
): Promise<void> {
    // Attempt to retrieve the next element of the loop iterable. If the iterable has been exhausted,
    // clear the loop variable, pop the loop frame, and step the program counter to its exit target.
    const loopFrame = fetchCurrentLoopFrame(planState);
    const loopIsExhausted =
        loopFrame.iterationIndex >= loopFrame.iterable.length
        || loopFrame.iterationIndex >= GATEWAY.config.loopMaxIterations;
    if (loopIsExhausted) {
        delete planState.evaluationContext.__locals__[loopFrame.variable.name];
        planState.loopStack.pop();
        await stepPlanProgramCounter(planState, planDefinition, instruction.exitTarget);
        return;
    }
    // Otherwise, the loop iterable is not exhausted, so bind to the loop variable its next element, increment
    // the running iteration index, and step the program counter to the next instruction, which will always be
    // first instruction of the loop body.
    planState.evaluationContext.__locals__[loopFrame.variable.name] = loopFrame.iterable[loopFrame.iterationIndex];
    loopFrame.iterationIndex++;
    await stepPlanProgramCounter(planState, planDefinition);
}

/**
 * Returns the loop frame at the top of the loop-frame stack in the given plan state.
 *
 * @param planState - Current plan state for the plan being executed.
 * @returns The loop frame at the top of the loop-frame stack in the given plan state.
 * @throws {VivInternalError} If a loop is not deemed exhausted but its stack is empty (defensive guard).
 */
function fetchCurrentLoopFrame(planState: PlanState): PlanLoopFrame {
    if (!planState.loopStack.length) {
        throw new VivInternalError("Attempted to fetch loop frame with empty stack");
    }
    return planState.loopStack[planState.loopStack.length - 1];
}

/**
 * Executes an {@link PlanInstructionReactionQueue}.
 *
 * This entails invoking the interpreter to evaluate the reaction. If there is an active reaction window,
 * we will also register with it the UID of the queued construct resulting from this reaction.
 *
 * @param instruction - A Viv {@link PlanInstructionReactionQueue}.
 * @param planState - Current plan state for the plan being executed.
 * @returns Nothing. The plan state is mutated in place.
 */
async function executePlanInstructionReaction(
    instruction: PlanInstructionReactionQueue,
    planState: PlanState
): Promise<void> {
    const queuedConstructID = await interpretExpression(instruction.reaction, planState.evaluationContext);
    if (planState.reactionWindowQueuedConstructs !== null) {
        planState.reactionWindowQueuedConstructs.push(queuedConstructID as UID);
    }
}

/**
 * Executes an {@link PlanInstructionReactionWindowClose}.
 *
 * This entails determining the status of the open reaction window with regard to its operator and the constructs
 * that were queued during the window. Depending on that result, there are three possible outcomes:
 *  - Fail the plan (reaction window can never be satisfied).
 *  - Advance into the next instruction (reaction window is now satisfied).
 *  - Remain on this instruction (we're still waiting on pending outcomes for the queued constructs).
 *
 * @param instruction - A Viv {@link PlanInstructionReactionWindowClose}.
 * @param planState - Current plan state for the plan being executed.
 * @param planDefinition - Definition for the plan being executed.
 * @returns Nothing. The plan state is mutated in place.
 * @throws {VivInternalError} If there is no reaction window in the plan state (defensive guard).
 * @throws {VivInternalError} The reaction window has an invalid operator (defensive guard).
 */
async function executePlanInstructionReactionWindowClose(
    instruction: PlanInstructionReactionWindowClose,
    planState: PlanState,
    planDefinition: PlanDefinition
): Promise<void> {
    // Determine the window status using its operator and operands, i.e., the constructs queued during
    // this window. Depending on the result, we will either fail the plan, advance into the next
    // instruction, or remain on this instruction pending outcomes for the queued constructs.
    if (planState.reactionWindowQueuedConstructs === null) {
        throw new VivInternalError(
            "Reached reaction-window close instruction, but there is no reaction window in the plan state"
        );
    }
    const allQueuedConstructStatuses = await GATEWAY.getQueuedConstructStatuses();
    const windowQueuedConstructStatuses = planState.reactionWindowQueuedConstructs.map(
        queuedConstructID => allQueuedConstructStatuses[queuedConstructID]
    );
    const failStatus = QueuedConstructStatus.Failed;
    const succeedStatus = QueuedConstructStatus.Succeeded;
    let canAdvancePlan: boolean;
    switch (instruction.operator) {
        case PlanPhaseReactionWindowOperator.Any:
            if (windowQueuedConstructStatuses.every(status => status === failStatus)) {
                await resolvePlan(planState, false);
                return;
            }
            canAdvancePlan = windowQueuedConstructStatuses.some(status => status === succeedStatus);
            break;
        case PlanPhaseReactionWindowOperator.All:
            if (windowQueuedConstructStatuses.some(status => status === failStatus)) {
                await resolvePlan(planState, false);
                return;
            }
            canAdvancePlan = windowQueuedConstructStatuses.every(status => status === succeedStatus);
            break;
        default:
            throw new VivInternalError(`Invalid reaction-window operator: '${(instruction as any).operator}'`);
    }
    // If we can advance past the reaction window, clear it, and then step into the next instruction
    if (canAdvancePlan) {
        planState.reactionWindowQueuedConstructs = null;
        await stepPlanProgramCounter(planState, planDefinition);
    }
}

/**
 * Executes an {@link PlanInstructionReactionWindowOpen}.
 *
 * This entails initializing a new reaction window and setting it in the plan state.
 *
 * @param planState - Current plan state for the plan being executed.
 * @returns Nothing. The plan state is mutated in place.
 */
async function executePlanInstructionReactionWindowOpen(planState: PlanState): Promise<void> {
    planState.reactionWindowQueuedConstructs = [];
}

/**
 * Executes an {@link PlanInstructionSucceed}.
 *
 * This entails resolving the plan with a final success status.
 *
 * @param planState - Current plan state for the plan being executed.
 * @returns Nothing. The plan state is mutated in place.
 */
async function executePlanInstructionSucceed(planState: PlanState): Promise<void> {
    await resolvePlan(planState, true);
}

/**
 * Executes an {@link PlanInstructionWaitEnd}.
 *
 * This entails advancing the program counter only if the wait deadline has elapsed or,
 * if applicable, all the resumption conditions currently hold.
 *
 * @param instruction - A Viv {@link PlanInstructionWaitEnd}.
 * @param planState - Current plan state for the plan being executed.
 * @param planDefinition - Definition for the plan being executed.
 * @returns Nothing. The plan state is mutated in place.
 * @throws {VivInternalError} If there is no wait deadline in the plan state (defensive guard).
 */
async function executePlanInstructionWaitEnd(
    instruction: PlanInstructionWaitEnd,
    planState: PlanState,
    planDefinition: PlanDefinition
): Promise<void> {
    // If the active wait deadline has not passed, we must continue to wait unless there
    // are resumption conditions that all hold currently.
    if (planState.waitDeadline === null) {
        throw new VivInternalError(
            "Reached wait-end instruction, but there is no wait deadline in the plan state"
        );
    }
    const currentTimestamp = await GATEWAY.getCurrentTimestamp();
    if (currentTimestamp < planState.waitDeadline) {
        if (instruction.resumeConditions === null) {
            return;
        }
        for (const condition of instruction.resumeConditions) {
            const evaluation = await interpretExpression(
                condition,
                planState.evaluationContext,
                true
            );
            if (!isTruthy(evaluation)) {
                return;
            }
        }
    }
    // If we get to here, the wait is over, so let's clear the deadline and step into the next instruction
    planState.waitDeadline = null;
    await stepPlanProgramCounter(planState, planDefinition);
}

/**
 * Executes an {@link PlanInstructionWaitStart}.
 *
 * This entails setting the {@link DiegeticTimestamp} at which this wait instruction
 * will expire. Note that it may expire sooner if it has resumption conditions that all hold at some point.
 *
 * @param instruction - A Viv {@link PlanInstructionWaitStart}.
 * @param planState - Current plan state for the plan being executed.
 * @returns Nothing. The plan state is mutated in place.
 */
async function executePlanInstructionWaitStart(
    instruction: PlanInstructionWaitStart,
    planState: PlanState
): Promise<void> {
    const currentTimestamp = await GATEWAY.getCurrentTimestamp();
    const waitDeadline = groundRelativePointInTime(currentTimestamp, instruction.timeout);
    planState.waitDeadline = waitDeadline;
}

/**
 * Steps the program counter in the given plan state by mutating it in place.
 *
 * If we have reached the end of the tape for the final phase of the plan, the plan will
 * be resolved with a success status.
 *
 * @param planState - Current plan state for the plan being executed.
 * @param planDefinition - Definition for the plan being executed.
 * @param targetAddress - If specified, a target address to serve as the new program counter. If none
 *     is provided, by default we will advance to the next instruction on the tape, if any, else `null`.
 * @returns Nothing. The plan state is mutated in place.
 */
async function stepPlanProgramCounter(
    planState: PlanState,
    planDefinition: PlanDefinition,
    targetAddress: PlanInstructionAddress | null = null
): Promise<void> {
    // If a target address was provided, go to it now and return
    if (targetAddress !== null) {
        planState.programCounter = targetAddress;
        return;
    }
    // Otherwise, attempt to step to the next instruction on the tape for the current phase
    const currentPhaseDefinition = planDefinition.phases[planState.currentPhase];
    if (currentPhaseDefinition.tape[planState.programCounter + 1]) {
        planState.programCounter++;
        return;
    }
    // We've reached the end of the tape for the current phase, so we need to advance into
    // the next phase. If there isn't a next phase, this will cause the plan to be resolved
    // with a final success status.
    await advancePlanPhase(planState, planDefinition);
}

/**
 * Advances plan execution to the next phase, if there is one, else resolves the plan with a final success status.
 *
 * @param planState - Current plan state for the plan being executed.
 * @param planDefinition - Definition for the plan being executed.
 * @returns Nothing. The plan state is mutated in place.
 */
async function advancePlanPhase(
    planState: PlanState,
    planDefinition: PlanDefinition
): Promise<void> {
    // Retrieve the current phase
    const currentPhaseDefinition = planDefinition.phases[planState.currentPhase];
    // Attempt to step into the first instruction on the tape for the next phase
    if (currentPhaseDefinition.next) {
        planState.currentPhase = currentPhaseDefinition.next;
        planState.programCounter = 0;
        // Emit a plan-execution event, for observability during debugging, as applicable
        emitPlanExecutionEvent({
            type: PlanExecutionEventType.PhaseAdvanced,
            planID: planState.id,
            plan: planState.planName,
            phase: planState.currentPhase
        });
        return;
    }
    // Otherwise, we have successfully reached the end of the tape for the last phase of the plan,
    // so we need to resolve the plan with a final success status.
    await resolvePlan(planState, true);
}

/**
 * Resolves the given plan by mutating its state in place, updating its associated queued-construct status,
 * and removing it from the collection of active plans.
 *
 * @param planState - Current plan state for the plan being resolved.
 * @param succeeded - Whether the resolved plan succeeded.
 * @returns Nothing. The plan's status will be updated via side effects, and the plan state is mutated in place.
 */
async function resolvePlan(planState: PlanState, succeeded: boolean) {
    // Mark the plan as resolved
    planState.resolved = true;
    // Emit an planning-execution event, for observability during debugging, as applicable
    emitPlanExecutionEvent({
        type: succeeded ? PlanExecutionEventType.Succeeded : PlanExecutionEventType.Failed,
        planID: planState.id,
        plan: planState.planName,
        phase: planState.currentPhase
    });
    // If the plan succeeded and it is associated with repeat logic, consider re-queueing it
    if (succeeded && planState.sourceQueuedPlan) {
        const repeatLogicFired =
            planState.sourceQueuedPlan.repeatLogic
            && planState.sourceQueuedPlan.repeatLogic.remainingInstances > 0  // Always the case if sourceQueuedPlan
            && await repeatConditionsHold(planState.sourceQueuedPlan.repeatLogic);
        if (repeatLogicFired) {
            await requeuePlan(planState.sourceQueuedPlan);
        }
    }
    // Update the queued-construct status and delete the plan state
    const updatedStatus = succeeded
        ? QueuedConstructStatus.Succeeded
        : QueuedConstructStatus.Failed;
    await GATEWAY.saveQueuedConstructStatus(planState.id, updatedStatus);
    await GATEWAY.deletePlanState(planState.id);
}
