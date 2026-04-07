/**
 * Enum specifying the discriminators for all Viv {@link PlanInstruction} variants.
 */
export enum PlanInstructionDiscriminator {
    /**
     * Advance to the next phase in the plan.
     */
    Advance = "advance",
    /**
     * Resolve the plan with a final failure status.
     */
    Fail = "fail",
    /**
     * Jump unconditionally to a new plan instruction.
     */
    Jump = "jump",
    /**
     * Jump to a new plan instruction if a condition does not hold.
     */
    JumpIfFalse = "jumpIfFalse",
    /**
     * Initialize a `foreach`-style loop frame.
     */
    LoopInit = "loopInit",
    /**
     * Advance an active loop frame to the next iteration, or exit the loop if its iterations have been exhausted.
     */
    LoopNext = "loopNext",
    /**
     * Queue a single {@link ReactionQueue}.
     */
    ReactionQueue = "reactionQueue",
    /**
     * Open a new reaction window.
     */
    ReactionWindowOpen = "reactionWindowOpen",
    /**
     * Close the active reaction window, and start trying to resolve the window according to its operator.
     */
    ReactionWindowClose = "reactionWindowClose",
    /**
     * Resolve the plan with a final success status.
     */
    Succeed = "succeed",
    /**
     * Resume execution of the plan following a pause imposed by a wait-start instruction.
     */
    WaitEnd = "waitEnd",
    /**
     * Commence a pause on execution of the plan that will persist until a timeout occurs (diegetic duration),
     * or until an optional set of author-supplied conditions hold.
     */
    WaitStart = "waitStart",
}

/**
 * Enum containing the valid operators for reaction windows.
 *
 * When a reaction window is active during execution of a plan phase, all reactions that are queued during
 * the window are tracked. Once the end of the window is reached, execution focuses on resolving the window
 * according to its operator. Depending on the operator and the reaction outcomes, this may require all the
 * queued reactions to be resolved.
 *
 * Note: The DSL allows for authors to specify an `untracked` operator, but this is equivalent to declaring
 * a sequence of bare reactions, and in fact this is how an `untracked` window is compiled. As such, the
 * operator never makes it into the compiled content bundle, hence it not appearing here.
 */
export enum PlanPhaseReactionWindowOperator {
    /**
     * All the reactions must be performed/launched in order for plan execution to proceed. Note that
     * plan execution will always proceed if no reactions are queued during the reaction window.
     */
    All = "all",
    /**
     * At least one of the reactions must be performed/launched in order for plan execution to proceed. Note
     * that the plan will always fail if no reactions are queued during the reaction window.
     */
    Any = "any",
}
