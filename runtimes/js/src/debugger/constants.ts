/**
 * Enum specifying canonical descriptions for the possible causes of backtracking
 * during role casting, which can be useful during debugging.
 *
 * @category Other
 */
export enum RoleCastingBacktrackReason {
    /**
     * A prospective role candidate was blacklisted.
     */
    BlacklistedCandidate = "blacklisted role candidate",
    /**
     * A prospective role quorum was blacklisted.
     */
    BlacklistedQuorum = "blacklisted role quorum",
    /**
     * A prospective role candidate was already cast in another role.
     */
    CandidateAlreadyCast = "role candidate already cast",
    /**
     * A prospective role candidate failed the role conditions.
     */
    CandidateFailedConditions = "candidate failed role conditions",
    /**
     * A prospective role candidate was not present for a role requiring presence.
     */
    CandidateNotPresent = "role candidate not present",
    /**
     * A prospective role candidate violates an embargo.
     */
    CandidateViolatesEmbargo = "role candidate violates embargo",
    /**
     * The role at hand could not be cast in a way that would avoid failure while casting
     * a downstream role (i.e., a descendant in the role-dependency forest).
     */
    DownstreamFailure = "downstream role could not be cast",
    /**
     * The global conditions for the construct failed.
     */
    GlobalConditionsFailed = "global conditions failed",
    /**
     * The maximum number of slots for a role were filled, but there were outstanding
     * precast candidates for that role.
     */
    OutstandingPrecastCandidate = "outstanding precast candidate(s)",
    /**
     * The casting pool was exhausted, but the minimum number of slots for a role
     * were not filled.
     */
    MinSlotsNotFilled = "min slots not filled",
    /**
     * The casting pool contained fewer candidates than the minimum number of role slots.
     */
    PoolTooSmall = "casting pool too small",
    /**
     * A precast candidate could not be cast in its associated role.
     */
    PrecastCandidateCouldNotBeCast = "precast candidate could not be cast",
    /**
     * A candidate precast for a role is not included in the actual casting pool
     * derived for the role.
     */
    PrecastCandidateNotInPool = "precast candidate not in casting pool",
    /**
     * A member of a prospective role quorum failed the role conditions.
     */
    QuorumMemberFailedConditions = "quorum member failed role conditions",
    /**
     * A prospective role quorum failed the role conditions.
     */
    QuorumFailedConditions = "quorum failed role conditions",
}

/**
 * Enum specifying the possible statuses associated with action-targeting attempts.
 *
 * @category Debugging
 */
export enum TargetingEventStatus {
    /**
     * Targeting of the action has just begun.
     */
    Started = "started",
    /**
     * The action was successfully targeted and will be performed.
     */
    Succeeded = "succeeded",
    /**
     * The action could not be targeted (e.g., role casting failed).
     */
    Failed = "failed"
}

/**
 * Enum specifying the possible impetuses for a given instance of action targeting.
 *
 * @category Debugging
 */
export enum ActionTargetingEventImpetus {
    /**
     * The action was forcibly targeted via the {@link attemptAction} API.
     */
    Forced = "forced",
    /**
     * The action was targeted from the general pool of non-reserved actions.
     */
    General = "general",
    /**
     * The action was queued for the initiator (via a reaction).
     */
    Queued = "queued"
}

/**
 * Enum specifying the discriminators for plan-execution events.
 *
 * @category Debugging
 */
export enum PlanExecutionEventType {
    /**
     * The plan was launched, i.e., role casting succeeded and execution has begun.
     */
    Launched = "launched",
    /**
     * Plan execution advanced into a new phase.
     */
    PhaseAdvanced = "phaseAdvanced",
    /**
     * Plan execution is blocked on a wait instruction.
     */
    BlockedOnWait = "blockedOnWait",
    /**
     * Plan execution is blocked on a reaction window.
     */
    BlockedOnReactionWindow = "blockedOnReactionWindow",
    /**
     * The plan completed successfully.
     */
    Succeeded = "succeeded",
    /**
     * The plan failed.
     */
    Failed = "failed"
}
