/**
 * Enum containing the canonical error names.
 *
 * *This is an internal type that is not part of the stable API surface. Its shape may change in any release.*
 *
 * @internal
 * @category Other
 */
export enum VivErrorName {
    /**
     * Base error from which all Viv runtime errors inherit.
     */
    VivError = "VivError",
    /**
     * thrown when something goes wrong during Viv runtime execution.
     */
    VivExecutionError = "VivExecutionError",
    /**
     * Error thrown when the Viv runtime reaches a state that should be impossible.
     */
    VivInternalError = "VivInternalError",
    /**
     * Error thrown when the interpreter crashes when attempting to evaluate a Viv expression.
     */
    VivInterpreterError = "VivInterpreterError",
    /**
     * Error thrown when a Viv runtime API function is called before the runtime has been initialized.
     */
    VivNotInitializedError = "VivNotInitializedError",
    /**
     * Error thrown when role casting fails in the course of targeting a construct.
     */
    VivRoleCastingError = "VivRoleCastingError",
    /**
     * Error thrown when validation fails for some data at a touch point between the Viv runtime
     * and the host application.
     */
    VivValidationError = "VivValidationError"
}

/**
 * Enum containing the possible subjects of a failed validation.
 *
 * @category Other
 */
export enum ValidationErrorSubject {
    /**
     * A content bundle that failed validation upon registration.
     */
    ContentBundle = "contentBundle",
    /**
     * A host-application adapter that failed validation upon registration.
     */
    Adapter = "adapter",
    /**
     * Arguments to a Viv API function that failed validation upon invocation.
     */
    APICall = "apiCall",
}

/**
 * Handle on the Node.js symbol for customizing `util.inspect` output.
 *
 * This is stored as a constant so that TypeScript can track it as a property key.
 */
export const NODE_INSPECT_SYMBOL = Symbol.for('nodejs.util.inspect.custom');
