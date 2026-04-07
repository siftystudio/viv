import type { ConstructDefinition, ConstructName, RoleName } from "../content-bundle/types";
import type { Expression } from "../dsl/types";
import type { EvaluationContext } from "../interpreter/types";
import { ConstructDiscriminator } from "../content-bundle";
import { NODE_INSPECT_SYMBOL, ValidationErrorSubject, VivErrorName } from "./constants";
import { dim, getConstructLabel, red, yellow } from "./utils";

/**
 * Base class for all Viv runtime errors.
 *
 * Consumers who want to catch any Viv error can use `instanceof VivError`.
 *
 * Note: A `VivError` will never be thrown directly.
 *
 * @category Errors
 */
export class VivError extends Error {
    /**
     * The name for a `VivError`.
     */
    override readonly name: VivErrorName = VivErrorName.VivError;

    /**
     * Constructs a new {@link VivError}.
     *
     * @param msg - A human-readable summary of the failure.
     */
    constructor(msg: string) {
        super(msg);
    }

    /**
     * A custom inspect handler that produces a human-readable summary of the error.
     *
     * This handler will be invoked when the error is displayed in Node via `console.log`,
     * `console.error`, `util.inspect`, or its uncaught-exception output.
     *
     * A few notes
     *  - This method only controls the display format. The structured properties will
     * remain available for programmatic access.
     *  - The child error types may override this with more specific handlers.
     *
     * @param depth - The current recursion depth in the Node inspect call.
     * @param options - The Node inspect options (used to determine whether colors are enabled).
     * @returns A formatted string summarizing the error.
     */
    [NODE_INSPECT_SYMBOL](depth: number, options: { colors: boolean }): string {
        return `\n${red(this.name + ': ' + this.message, options)}\n`;
    }

    /**
     * Returns a formatted human-readable summary of the error.
     */
    override toString(): string {
        return this[NODE_INSPECT_SYMBOL](0, { colors: false });
    }
}

/**
 * Error thrown when something goes wrong during Viv runtime execution.
 *
 * This includes failures in the interpreter, role caster, planner, and other subsystems that
 * act on compiled Viv content. Generally, such failures are caused by authoring errors in the
 * compiled content bundle.
 *
 * While occasionally a `VivExecutionError` will be thrown directly, usually execution issues
 * will cause a child error type to be thrown:
 *  - {@link VivInterpreterError}: A Viv expression could not be evaluated.
 *  - {@link VivRoleCastingError}: A given construct role could not be cast.
 *
 * Though certainly not ideal, execution errors may be recoverable in production, e.g., by skipping
 * a problematic construct and logging a warning.
 *
 * Consumers who want to catch any execution-phase error can use `instanceof VivExecutionError`.
 *
 * @category Errors
 */
export class VivExecutionError extends VivError {
    /**
     * The name for a `VivExecutionError`.
     */
    override readonly name: VivErrorName = VivErrorName.VivExecutionError;
    /**
     * If applicable, an object containing additional context, such as the evaluations
     * of certain fields or intermediate concerns.
     *
     * The key names used here will be descriptive.
     */
    readonly extraContext?: Record<string, unknown>;

    /**
     * Constructs a new {@link VivExecutionError}.
     *
     * @param msg - A human-readable summary of the failure.
     * @param extraContext - If applicable, an object containing additional context, such as the
     *     evaluations of certain fields or intermediate concerns.
     */
    constructor(msg: string, extraContext?: Record<string, unknown>) {
        super(msg);
        if (extraContext) {
            this.extraContext = extraContext;
        }
    }

    /**
     * A custom inspect handler that produces a human-readable summary of the error.
     *
     * This handler will be invoked when the error is displayed in Node via `console.log`,
     * `console.error`, `util.inspect`, or its uncaught-exception output.
     *
     * Note: This method only controls the display format. The structured properties will
     * remain available for programmatic access.
     *
     * @param depth - The current recursion depth in the Node inspect call.
     * @param options - The Node inspect options (used to determine whether colors are enabled).
     * @returns A formatted string summarizing the error.
     */
    [NODE_INSPECT_SYMBOL](depth: number, options: { colors: boolean }): string {
        let output = '';
        if (this.extraContext) {
            output += dim(`\n== ${this.name} Details ==\n`, options);
            output += dim(JSON.stringify(this.extraContext, null, 2), options) + '\n\n';
        }
        output += red(`\n${this.name}: ${this.message}\n`, options);
        if (this.extraContext) {
            output += dim(' (scroll up for details)\n', options);
        }
        return output;
    }
}

/**
 * Error thrown when the Viv interpreter fails to evaluate an expression.
 *
 * These errors occur due to authoring issues in the compiled content bundle that cannot be detected
 * at compilation time, because they depend on the live simulation state. Usually the cause is some
 * kind of type issue, such an array access where the key expression does not evaluate to an integer.
 *
 * @category Errors
 */
export class VivInterpreterError extends VivExecutionError {
    /**
     * The name for a `VivInterpreterError`.
     */
    override readonly name: VivErrorName = VivErrorName.VivInterpreterError;
    /**
     * The Viv expression at hand when the failure occurred.
     */
    readonly expression: Expression;
    /**
     * The evaluation context at hand when the failure occurred.
     */
    readonly evaluationContext: EvaluationContext;
    /**
     * If applicable, an exception that caused the interpreter failure that is external in origin,
     * due to originating in a call to a {@link CustomFunction} exposed in the
     * host-application adapter.
     */
    readonly externalCause?: unknown;

    /**
     * Constructs a new {@link VivInterpreterError}.
     *
     * @param msg - A human-readable summary of the failure.
     * @param expression - The Viv expression at hand when the failure occurred.
     * @param context - The evaluation context at hand when the failure occurred.
     * @param extraContext - If applicable, an object containing additional context, such as the
     *     evaluations of certain fields or intermediate concerns.
     * @param externalCause - If applicable, the external exception that caused the interpreter failure.
     */
    constructor(
        msg: string,
        expression: Expression,
        context: EvaluationContext,
        extraContext?: Record<string, unknown>,
        externalCause?: unknown
    ) {
        super(msg, extraContext);
        this.expression = expression;
        this.evaluationContext = context;
        if (externalCause) {
            this.externalCause = externalCause;
        }
    }

    /**
     * A custom inspect handler that produces a human-readable summary of the error.
     *
     * This handler will be invoked when the error is displayed in Node via `console.log`,
     * `console.error`, `util.inspect`, or its uncaught-exception output.
     *
     * Note: This method only controls the display format. The structured properties will
     * remain available for programmatic access.
     *
     * @param depth - The current recursion depth in the Node inspect call.
     * @param options - The Node inspect options (used to determine whether colors are enabled).
     * @returns A formatted string summarizing the error.
     */
    [NODE_INSPECT_SYMBOL](depth: number, options: { colors: boolean }): string {
        // Prepare the components of the error message
        const source = this.expression.source;
        const location = source ? `${source.filePath}:${source.line}:${source.column}` : 'autogenerated';
        const code = source?.code ?? 'unknown';
        let construct = "N/A";
        if (this.evaluationContext.__constructType__) {
            construct = (
                `${this.evaluationContext.__constructName__} `
                + `(${getConstructLabel(this.evaluationContext.__constructType__)})`
            );
        }
        const expression = `${code} (${location})`;
        const evaluationContext = JSON.stringify(this.evaluationContext, null, 2);
        let extraInfo: string | null = null;
        if (this.extraContext) {
            extraInfo = JSON.stringify(this.extraContext, null, 2);
        }
        let adapterError: string | null = null;
        if (this.externalCause instanceof Error) {
            adapterError = `${this.externalCause.message}\n${this.externalCause.stack}`;
        }
        // Construct the error message
        let output = dim(`\n== ${this.name} Details ==\n`, options);
        output += dim("- Target construct: ", options) + yellow(construct, options) + '\n';
        output += dim("- Expression: ", options) + yellow(expression, options) + '\n';
        output += dim("- Evaluation context:\n", options) + dim(evaluationContext, options) + '\n';
        if (extraInfo) {
            output += dim("- Extra info:\n", options) + dim(extraInfo, options) + '\n';
        }
        if (adapterError) {
            output += dim("- Adapter error:\n", options) + red(adapterError, options) + '\n';
        }
        output += red(`\n${this.name}: ${this.message}\n`, options);
        if (this.extraContext) {
            output += dim(' (scroll up for details)\n', options);
        }
        return output;
    }
}

/**
 * Error thrown while performing role casting for a given construct.
 *
 * These errors occur due to authoring issues in the compiled content bundle that cannot be detected
 * at compilation time, because they depend on the live simulation state. Examples include malformed
 * precast bindings, bad casting pools, or candidates that violate role constraints.
 *
 * @category Errors
 */
export class VivRoleCastingError extends VivExecutionError {
    /**
     * The name for a `VivRoleCastingError`.
     */
    override readonly name: VivErrorName = VivErrorName.VivRoleCastingError;
    /**
     * The type of construct being targeted when the error occurred.
     */
    readonly constructType: ConstructDiscriminator;
    /**
     * The name of the construct being targeted when the error occurred.
     */
    readonly constructName: ConstructName;
    /**
     * The name of the role that was being cast when the failure occurred.
     */
    readonly roleName: RoleName;

    /**
     * Constructs a new {@link VivRoleCastingError}.
     *
     * @param msg - A human-readable summary of the failure.
     * @param constructDefinition - Definition for the construct being targeted when the error occurred.
     * @param roleName - Name of the role involved in the failure.
     * @param extraContext - If applicable, an object containing additional context about the failure.
     */
    constructor(
        msg: string,
        constructDefinition: ConstructDefinition,
        roleName: RoleName,
        extraContext?: Record<string, unknown>
    ) {
        super(msg, extraContext);
        this.constructType = constructDefinition.type;
        this.constructName = constructDefinition.name;
        this.roleName = roleName;
    }

    /**
     * A custom inspect handler that produces a human-readable summary of the error.
     *
     * This handler will be invoked when the error is displayed in Node via `console.log`,
     * `console.error`, `util.inspect`, or its uncaught-exception output.
     *
     * Note: This method only controls the display format. The structured properties will
     * remain available for programmatic access.
     *
     * @param depth - The current recursion depth in the Node inspect call.
     * @param options - The Node inspect options (used to determine whether colors are enabled).
     * @returns A formatted string summarizing the error.
     */
    [NODE_INSPECT_SYMBOL](depth: number, options: { colors: boolean }): string {
        // Prepare the components of the error message
        const construct = `${this.constructName} (${getConstructLabel(this.constructType)})`;
        let extraInfo: string | null = null;
        if (this.extraContext) {
            extraInfo = JSON.stringify(this.extraContext, null, 2);
        }
        // Construct the error message
        let output = dim(`\n== ${this.name} Details ==\n`, options);
        output += dim("- Target construct: ", options) + yellow(construct, options) + '\n';
        output += dim("- Role name: ", options) + yellow(this.roleName, options) + '\n';
        if (extraInfo) {
            output += dim("- Extra info:\n", options) + dim(extraInfo, options) + '\n';
        }
        output += red(`\n${this.name}: ${this.message}\n`, options);
        if (this.extraContext) {
            output += dim(' (scroll up for details)\n', options);
        }
        return output;
    }
}

/**
 * Error thrown when validation fails for data at a touch point between
 * the Viv runtime and a host application.
 *
 * @category Errors
 */
export class VivValidationError extends VivError {
    /**
     * The name for a `VivValidationError`.
     */
    override readonly name: VivErrorName = VivErrorName.VivValidationError;
    /**
     * The kind of data that was being validated when the failure occurred.
     */
    readonly subject: ValidationErrorSubject;
    /**
     * An array containing human-readable explanations of the specific validation issues.
     */
    readonly validationErrors: string[];

    /**
     * Constructs a new {@link VivValidationError}.
     *
     * @param msg - A human-readable summary of the failure.
     * @param subject - The kind of data that was being validated.
     * @param validationErrors - The validation errors reported by the validator, if any.
     */
    constructor(msg: string, subject: ValidationErrorSubject, validationErrors: string[]) {
        super(msg);
        this.subject = subject;
        this.validationErrors = validationErrors;
    }

    /**
     * A custom inspect handler that produces a human-readable summary of the error.
     *
     * This handler will be invoked when the error is displayed in Node via `console.log`,
     * `console.error`, `util.inspect`, or its uncaught-exception output.
     *
     * Note: This method only controls the display format. The structured properties will
     * remain available for programmatic access.
     *
     * @param depth - The current recursion depth in the Node inspect call.
     * @param options - The Node inspect options (used to determine whether colors are enabled).
     * @returns A formatted string summarizing the error.
     */
    [NODE_INSPECT_SYMBOL](depth: number, options: { colors: boolean }): string {
        let output = '';
        if (this.validationErrors.length === 1) {
            output += `\n${red(this.name + ': ' + this.message, options)}\n\n`;
            output += dim(this.validationErrors[0], options) + '\n';
        } else {
            output += dim(`\n== ${this.name} Details ==\n`, options);
            for (const error of this.validationErrors) {
                output += dim('- ', options) + dim(error, options) + '\n';
            }
            output += `\n${red(this.name + ': ' + this.message, options)}`;
            output += dim(' (scroll up for details)\n', options);
        }
        return output;
    }
}

/**
 * Error thrown when a Viv runtime API function is called before the runtime has been initialized.
 *
 * @category Errors
 */
export class VivNotInitializedError extends VivError {
    /**
     * The name for a `VivNotInitializedError`.
     */
    override readonly name: VivErrorName = VivErrorName.VivNotInitializedError;

    /**
     * Constructs a new {@link VivNotInitializedError}.
     *
     * @param msg - A human-readable summary of the failure.
     */
    constructor(msg: string) {
        super(msg);
    }
}

/**
 * Error thrown when the Viv runtime reaches a state that should be impossible.
 *
 * A `VivInternalError` indicates a bug in the Viv runtime itself, not a content or integration issue.
 *
 * If you encounter an instance of this error, please report it.
 *
 * @category Errors
 */
export class VivInternalError extends VivError {
    /**
     * The name for a `VivInternalError`.
     */
    override readonly name: VivErrorName = VivErrorName.VivInternalError;

    /**
     * Constructs a new {@link VivInternalError}.
     *
     * @param msg - A human-readable summary of the failure.
     */
    constructor(msg: string) {
        super(msg);
    }
}
