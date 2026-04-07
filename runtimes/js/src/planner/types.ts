import type { DiegeticTimestamp, UID } from "../adapter/types";
import type { PlanName, PlanPhaseName } from "../content-bundle/types";
import type { Expression, LocalVariable, Reaction, TimeDelta } from "../dsl/types";
import type { EvaluationContext, ExpressionValue } from "../interpreter/types";
import type { QueuedPlan, QueuedPlanSelector } from "../queue-manager/types";
import type { RoleBindings } from "../role-caster/types";
import type { PlanInstructionDiscriminator, PlanPhaseReactionWindowOperator } from "./constants";

/**
 * State for an active plan, meaning what that has been launched and is still underway.
 *
 * Execution of the plan will continue until a success or failure point is reached.
 *
 * *This is an internal type that is not part of the stable API surface. Its shape may change in any release.*
 *
 * @internal
 * @category Other
 */
export interface PlanState {
    /**
     * UID for the launched plan.
     */
    readonly id: UID;
    /**
     * The name of the plan at hand.
     */
    readonly planName: PlanName;
    /**
     * The final bindings that were constructed for the plan during role casting.
     *
     * Bindings map roles to the respective entities (or symbols) that were cast in those roles.
     */
    readonly bindings: RoleBindings;
    /**
     * The (dehydrated) evaluation context associated with the launched plan.
     */
    readonly evaluationContext: EvaluationContext;
    /**
     * The name of the current plan phase.
     *
     * Always initializes to the name of the first phase in the plan.
     */
    currentPhase: PlanPhaseName;
    /**
     * A program counter indicating the address of the current
     * plan instruction, which is concretely an index into the `tape`
     * array of the current plan phase.
     *
     * Always initializes to `0`.
     */
    programCounter: PlanInstructionAddress;
    /**
     * The current stack of loop frames, which we process using a LIFO policy.
     *
     * This is an empty array when there are no active loops.
     */
    loopStack: PlanLoopFrame[];
    /**
     * UIDs for all queued constructs that have been queued during the active reaction window,
     * if there is one, else `null`.
     *
     * Following the opening of a reaction window, all reactions
     * queued during the window are tracked. At the close of
     * the window, depending on the operator and the {@link QueuedConstructStatus} of these queued
     * constructs, either the plan will fail entirely or plan execution will advance to the next instruction.
     */
    reactionWindowQueuedConstructs: UID[] | null;
    /**
     * The deadline for an active wait instruction, if any, else `null`.
     *
     * This is the diegetic timestamp at which the wait will expire, though there may be associated
     * conditions that could cause an earlier progression to the next instruction.
     */
    waitDeadline: DiegeticTimestamp | null;
    /**
     * Whether plan execution has terminated, regardless of the reason.
     */
    resolved: boolean;
    /**
     * When applicable, the original queued plan (or plan selector) that resulted in this plan being launched.
     *
     * This field is only present when the original queued plan has repeat logic. In such cases, the plan
     * might be re-queued upon successful execution, and as such we need to keep the original queued plan
     * around so that we can make a copy later on.
     *
     * Note that this situation differs considerably from action re-queueing: because an action is performed
     * instantaneously, we will always still have the queued action handy at the time it's successfully
     * executed. In the case of a plan, however, arbitrary amounts of time can pass between launching
     * a queued plan and its being successfully performed.
     */
    sourceQueuedPlan?: QueuedPlan | QueuedPlanSelector;
}

/**
 * A loop frame in the loop stack for an active plan.
 *
 * This stores data about a loop that is in progress.
 */
export interface PlanLoopFrame {
    /**
     * An array storing the evaluated loop iterable, which will be iterated over one element
     * at a time, with the element at hand being bound to `variable`.
     *
     * Note that the iterable is evaluated only once, upon {@link PlanInstructionLoopInit},
     * and that it is stored in a {@link dehydrateExpressionValue} state.
     */
    readonly iterable: ExpressionValue[];
    /**
     * The local variable to which each member of the iterable is assigned on its respective
     * iteration of the loop.
     */
    readonly variable: LocalVariable;
    /**
     * The index in `iterable` to be used to retrieve the loop-variable binding for the next iteration.
     *
     * This is incremented by one at the end of each iteration, and the loop
     * {@link PlanInstructionLoopNext} once this matches the length of `iterable`.
     */
    iterationIndex: number;
}

/**
 * A compiled instruction in a plan tape.
 */
export type PlanInstruction =
    | PlanInstructionAdvance
    | PlanInstructionFail
    | PlanInstructionJump
    | PlanInstructionJumpIfFalse
    | PlanInstructionLoopInit
    | PlanInstructionLoopNext
    | PlanInstructionReactionQueue
    | PlanInstructionReactionWindowClose
    | PlanInstructionReactionWindowOpen
    | PlanInstructionSucceed
    | PlanInstructionWaitEnd
    | PlanInstructionWaitStart;

/**
 * A plan instruction that advances to the next plan phase, skipping any remaining
 * instructions in the current phase.
 */
export interface PlanInstructionAdvance {
    /**
     * Discriminator for an advance plan instruction.
     */
    readonly type: PlanInstructionDiscriminator.Advance;
}

/**
 * A plan instruction that resolves the plan with a final failure status.
 */
export interface PlanInstructionFail {
    /**
     * Discriminator for a fail plan instruction.
     */
    readonly type: PlanInstructionDiscriminator.Fail;
}

/**
 * A plan instruction that causes an unconditional jump to a different position
 * in the phase's instruction tape.
 */
export interface PlanInstructionJump {
    /**
     * Discriminator for a jump plan instruction.
     */
    readonly type: PlanInstructionDiscriminator.Jump;
    /**
     * The instruction address to which execution will jump unconditionally.
     *
     * Jumps can only occur within the tape for a given phase, which is why an address alone is sufficient here.
     */
    readonly target: PlanInstructionAddress;
}

/**
 * A plan instruction that specifies a conditional jump to a different position in the phase's instruction tape.
 *
 * If the condition does not hold, the plan executor will proceed to the next instruction
 * (i.e., increment program counter by one). This enables conditionals in plan bodies.
 */
export interface PlanInstructionJumpIfFalse {
    /**
     * Discriminator for a jump-if-false plan instruction.
     */
    readonly type: PlanInstructionDiscriminator.JumpIfFalse;
    /**
     * The condition to evaluate.
     *
     * If it does *not* hold, execution will proceed to the instruction address specified in the `target`
     * field, else it will proceed to the next instruction (by incrementing the counter by one).
     */
    readonly condition: Expression;
    /**
     * The instruction address to which execution will jump if the instruction `condition` does *not* hold.
     */
    readonly target: PlanInstructionAddress;
}

/**
 * A plan instruction that initializes a loop frame and pushes it onto the loop stack.
 */
export interface PlanInstructionLoopInit {
    /**
     * Discriminator for a loop-init plan instruction.
     */
    readonly type: PlanInstructionDiscriminator.LoopInit;
    /**
     * The expression yielding the iterable to loop over.
     *
     * This will be evaluated once, at the time the loop is initialized. For example, a loop over
     * `@foo.friends` with a loop-body instruction causing a one-year wait after each iteration
     * would still be operating over the friends that `@foo` had at the time the loop was entered
     * (years ago, in diegetic terms).
     */
    readonly iterable: Expression;
    /**
     * The local variable to bind on each iteration, which the plan executor stores in the loop
     * frame that will be created when executing this instruction.
     */
    readonly variable: LocalVariable;
}

/**
 * A plan instruction that advances the active loop frame by one iteration, or else exits
 * the loop if the iterable has been exhausted.
 *
 * If there is a next element in the iterable, the plan executor will bind it to the loop variable and
 * fall through to the next instruction (i.e., increment by the program counter by one). If the iterable
 * has been exhausted, the executor will jump to the instruction address specified by `exitTarget`.
 */
export interface PlanInstructionLoopNext {
    /**
     * Discriminator for a loop-next plan instruction.
     */
    readonly type: PlanInstructionDiscriminator.LoopNext;
    /**
     * The instruction address to jump to when the loop iterable is exhausted.
     *
     * If the iterable is empty from the start, the loop will immediately exit by virtue of this instruction.
     */
    readonly exitTarget: PlanInstructionAddress;
}

/**
 * A plan instruction that causes queueing of an action, plan, or selector according
 * to a specified {@link Reaction}.
 */
export interface PlanInstructionReactionQueue {
    /**
     * Discriminator for a reaction-queue plan instruction.
     */
    readonly type: PlanInstructionDiscriminator.ReactionQueue;
    /**
     * The reaction declaration.
     */
    readonly reaction: Reaction;
}

/**
 * A plan instruction that opens a new reaction window whose resolution will be governed by a
 * {@link PlanPhaseReactionWindowOperator} specified in the corresponding
 * {@link PlanInstructionReactionWindowClose} instruction.
 */
export interface PlanInstructionReactionWindowOpen {
    /**
     * Discriminator for a plan instruction that opens a reaction window.
     */
    readonly type: PlanInstructionDiscriminator.ReactionWindowOpen;
}

/**
 * A plan instruction that closes the active reaction window, pending resolution that is
 * governed by a specified {@link PlanPhaseReactionWindowOperator}.
 */
export interface PlanInstructionReactionWindowClose {
    /**
     * Discriminator for a plan instruction that closes the active reaction window.
     */
    readonly type: PlanInstructionDiscriminator.ReactionWindowClose;
    /**
     * The logical operator that will govern resolution of the reaction window.
     */
    readonly operator: PlanPhaseReactionWindowOperator;
}

/**
 * A plan instruction that resolves the plan with a final success status.
 */
export interface PlanInstructionSucceed {
    /**
     * Discriminator for a succeed plan instruction.
     */
    readonly type: PlanInstructionDiscriminator.Succeed;
}

/**
 * A plan instruction that resumes plan execution following a pause imposed by a
 * {@link PlanInstructionWaitStart} instruction.
 */
export interface PlanInstructionWaitEnd {
    /**
     * Discriminator for a wait-end plan instruction.
     */
    readonly type: PlanInstructionDiscriminator.WaitEnd;
    /**
     * If specified, a set of expressions that must hold to resume plan execution prior to the timeout elapsing.
     */
    readonly resumeConditions: Expression[] | null;
}

/**
 * A plan instruction that commences a pause on plan execution that will persist
 * until a timeout elapses or a set of conditions hold.
 */
export interface PlanInstructionWaitStart {
    /**
     * Discriminator for a wait-start plan instruction.
     */
    readonly type: PlanInstructionDiscriminator.WaitStart;
    /**
     * A timeout, expressed as the maximum period of story time to wait counting from the time
     * at which this instruction was executed.
     */
    readonly timeout: TimeDelta;
}

/**
 * An address for an {@link PlanInstruction} in a {@link PlanPhase},
 * which is really just as an index into the phase's `tape` array property.
 *
 * As plan execution proceeds, the executor maintains the address for the current
 * instruction as a program counter.
 */
export type PlanInstructionAddress = number;
