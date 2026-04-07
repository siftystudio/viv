/**
 * Enum specifying the discriminators for all queued construct variants.
 */
export enum QueuedConstructDiscriminator {
    /**
     * A queued action.
     */
    Action = "action",
    /**
     * A queued action selector.
     */
    ActionSelector = "actionSelector",
    /**
     * A queued plan.
     */
    Plan = "plan",
    /**
     * A queued plan selector.
     */
    PlanSelector = "planSelector"
}

/**
 * Enum specifying the possible statuses for a Viv queued construct.
 *
 * Each queued construct begins with a pending status, prior to a terminal status (success or failure)
 * being reached. A terminal status can never change.
 *
 * *This is an internal type that is not part of the stable API surface. Its shape may change in any release.*
 *
 * @internal
 * @category Other
 */
export enum QueuedConstructStatus {
    /**
     * The queued construct failed, meaning it was dequeued. This can happen for a variety reason,
     * such as expiration, abandonment conditions holding, or the failure of a step in a plan.
     */
    Failed = "failed",
    /**
     * The queued construct is still pending:
     *  - If it is an action or an action selector, it is still queued.
     *  - If it is a plan or a plan selector, it is either still queued or is currently underway.
     *
     * This is the default status for a queued construct, prior to a terminal status being reached.
     */
    Pending = "pending",
    /**
     * The queued construct succeeded:
     *  - If it is an action or an action selector, an action was performed.
     *  - If it is a plan or a plan selector, a plan was launched.
     */
    Succeeded = "succeeded"
}
