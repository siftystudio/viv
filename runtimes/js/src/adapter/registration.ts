import type { HostApplicationAdapter } from "./types";
import { CONTENT_BUNDLE } from "../content-bundle";
import { VivValidationError, ValidationErrorSubject } from "../errors";
import { createVivAdapterGateway } from "../gateway";
import { SCHEMA_VALIDATORS, validateAgainstSchema } from "../schemas";

/**
 * Plugs in the Viv adapter for the host application at hand, making it accessible to the runtime.
 *
 * @param adapter - The Viv adapter for the host application at hand.
 * @returns Nothing, but only if validation succeeds.
 */
export function registerVivAdapter(adapter: unknown): void {
    // Validate the adapter. If this fails, an error will be thrown.
    validateVivAdapter(adapter);
    // If we get to here, validation succeeded, so we can create the gateway
    createVivAdapterGateway(adapter);
}

/**
 * Validates the given Viv adapter for the host application at hand.
 *
 * This process makes use of structural validation (against a generated schema) and also a battery of
 * manual checks that confirm the adapter is compatible with the content bundle it will be paired with.
 *
 * @param adapter - A Viv adapter for the host application at hand.
 * @returns If validation succeeds.
 * @throws If validation fails.
 */
function validateVivAdapter(adapter: unknown): asserts adapter is HostApplicationAdapter {
    // First, structurally validate the adapter
    validateAgainstSchema<HostApplicationAdapter>(
        adapter,
        SCHEMA_VALIDATORS.hostApplicationAdapter,
        ValidationErrorSubject.Adapter
    );
    // Now carry out the manual checks
    validateConfigParameters(adapter);
    validateReferencedEnums(adapter);
    validateReferencedFunctions(adapter);
    validateTimeOfDayCompatibility(adapter);
    validateEntityDataAssignmentCompatibility(adapter);
    validateWatchlists(adapter);
}

/**
 * Validates the config parameters specified in the given adapter, if any.
 *
 * Note that the structural validation above will have already confirmed that each parameter
 * is of the correct type. As such, the checks carried out here are semantic in nature.
 *
 * @param adapter - A Viv adapter for the host application at hand.
 * @returns If all config parameters are valid.
 * @throws If any config parameter has an invalid value.
 */
function validateConfigParameters(adapter: HostApplicationAdapter): void {
    if (adapter.config?.loopMaxIterations !== undefined) {
        if (adapter.config.loopMaxIterations <= 0) {
            throwAdapterValidationError(`Config parameter 'loopMaxIterations' must be a positive number`);
        }
    }
    if (adapter.config?.memoryMaxSalience != null) {
        if (adapter.config.memoryMaxSalience <= 0) {
            throwAdapterValidationError(
                `Config parameter 'memoryMaxSalience' must be a positive number (or null)`
            );
        }
    }
    if (adapter.config?.memoryRetentionMonthlyMultiplier !== undefined) {
        if (
            adapter.config.memoryRetentionMonthlyMultiplier < 0
            || adapter.config.memoryRetentionMonthlyMultiplier > 1
        ) {
            throwAdapterValidationError(
                `Config parameter 'memoryRetentionMonthlyMultiplier' must be in the range [0.0, 1.0]`
            );
        }
    }
    if (adapter.config?.memoryForgettingSalienceThreshold != null) {
        if (adapter.config.memoryForgettingSalienceThreshold <= 0) {
            throwAdapterValidationError(
                `Config parameter 'memoryForgettingSalienceThreshold' must be a positive number, `
                + `otherwise forgetting cannot occur (to disable forgetting, set `
                + `'memoryRetentionMonthlyMultiplier' to 1.0 and/or never call fadeMemories())`
            );
        }
    }
}

/**
 * Ensures that all enums referenced in the content bundle are defined in the given adapter.
 *
 * In Viv, enums are defined in the host application adapter rather than in the content bundle itself.
 *
 * @param adapter - A Viv adapter for the host application at hand.
 * @returns If all referenced enums are defined.
 * @throws If any referenced enum is missing from the adapter.
 */
function validateReferencedEnums(adapter: HostApplicationAdapter): void {
    for (const enumName of CONTENT_BUNDLE.metadata.referencedEnums) {
        if (adapter.enums === undefined || !(enumName in adapter.enums)) {
            throwAdapterValidationError(
                `Enum '${enumName}' is referenced in the content bundle, but is not `
                + `defined in the adapter's 'enums' field`
            );
        }
    }
}

/**
 * Ensures that all custom functions referenced in the content bundle are defined in the given adapter.
 *
 * Custom functions are defined in the host application adapter, and the content bundle references them
 * by name. Our structural validation above will have already confirmed that each registered function is
 * indeed a function, but not that all custom functions referenced in the content bundle have indeed been
 * registered in the adapter.
 *
 * Note that function signatures cannot be validated at runtime, due to JavaScript limitations.
 *
 * @param adapter - A Viv adapter for the host application at hand.
 * @returns If all referenced custom functions are defined.
 * @throws If any referenced custom function is missing from the adapter.
 */
function validateReferencedFunctions(adapter: HostApplicationAdapter): void {
    for (const functionName of CONTENT_BUNDLE.metadata.referencedFunctionNames) {
        if (adapter.functions === undefined || !adapter.functions[functionName]) {
            throwAdapterValidationError(
                `Custom function '${functionName}' is referenced in the content bundle, `
                + `but is not defined in the adapter's 'functions' field`
            );
        }
    }
}

/**
 * If the adapter opts out of time-of-day modeling, ensures that no constructs in the content bundle
 * are parameterized by time of day.
 *
 * Opting out of time-of-day modeling means not implementing the `getCurrentTimeOfDay` function
 * in the adapter. If this is the case, the content bundle may not include any reactions or queries
 * constrained by time of day.
 *
 * @param adapter - A Viv adapter for the host application at hand.
 * @returns If the adapter is compatible with the content bundle's time-of-day usage.
 * @throws If the adapter opts out of time-of-day modeling while the content bundle requires it.
 */
function validateTimeOfDayCompatibility(adapter: HostApplicationAdapter): void {
    // If the adapter implements `getCurrentTimeOfDay`, there is nothing to check here
    if (adapter.getCurrentTimeOfDay) {
        return;
    }
    // Determine whether the content bundle includes any constructs parameterized by time of day
    const timeOfDayUsage =
        CONTENT_BUNDLE.metadata.timeOfDayParameterizedReactions.length
        || CONTENT_BUNDLE.metadata.timeOfDayParameterizedQueries.length;
    if (!timeOfDayUsage) {
        return;
    }
    // We've got a problem. Let's compile a diagnostic message that lists the offending constructs.
    let errorMessage = (
        "Adapter opts out of time-of-day modeling but its content bundle includes "
        + "construct(s) constrained by time of day:\n"
    );
    for (const reaction of CONTENT_BUNDLE.metadata.timeOfDayParameterizedReactions) {
        errorMessage += `  - '${reaction.reaction}' reaction in action '${reaction.constructName}'\n`;
    }
    for (const queryName of CONTENT_BUNDLE.metadata.timeOfDayParameterizedQueries) {
        errorMessage += `  - query '${queryName}'\n`;
    }
    throwAdapterValidationError(errorMessage);
}

/**
 * If the adapter does not implement `updateEntityProperty`, ensures that the content bundle
 * contains no assignments that attempt to modify entity data.
 *
 * Entity-data assignments are Viv expressions that set or update properties on entities (e.g.,
 * `@character.mood = #HAPPY`). These require the adapter to implement `updateEntityProperty`,
 * which is the bridge through which the runtime may execute such an assignment.
 *
 * If `updateEntityProperty` is not implemented, Viv can only carry out state updates via custom functions.
 *
 * @param adapter - A Viv adapter for the host application at hand.
 * @returns If the adapter is compatible with the content bundle's entity-data assignment usage.
 * @throws If the content bundle includes entity-data assignments while the adapter does not support them.
 */
function validateEntityDataAssignmentCompatibility(adapter: HostApplicationAdapter): void {
    if (!adapter.updateEntityProperty && CONTENT_BUNDLE.metadata.hasEntityDataAssignments) {
        throwAdapterValidationError(
            `The content bundle contains assignments that modify entity data, `
            + `but the adapter does not implement the 'updateEntityProperty()' function`
        );
    }
}

/**
 * If the adapter specifies any debugging watchlists, ensures that all watched constructs are defined
 * in the content bundle.
 *
 * Watchlists are a debugging tool that allows developers to track targeting data for specific constructs.
 *
 * If a construct on a watchlist is not defined in the content bundle, this is always a mistake
 * (e.g., a typo or a stale reference), so we flag it immediately rather than silently producing
 * no debugging data for the missing construct.
 *
 * @param adapter - A Viv adapter for the host application at hand.
 * @returns If all watched constructs are defined in the content bundle.
 * @throws If any watched construct is not defined in the content bundle.
 */
function validateWatchlists(adapter: HostApplicationAdapter): void {
    const watchlists = adapter.debug?.watchlists;
    if (!watchlists) {
        return;
    }
    const watchlistEntries: { names: string[], registry: Record<string, unknown>, label: string }[] = [
        { names: watchlists.actions ?? [], registry: CONTENT_BUNDLE.actions, label: "Action" },
        { names: watchlists.actionSelectors ?? [], registry: CONTENT_BUNDLE.actionSelectors, label: "Action selector" },
        { names: watchlists.plans ?? [], registry: CONTENT_BUNDLE.plans, label: "Plan" },
        { names: watchlists.planSelectors ?? [], registry: CONTENT_BUNDLE.planSelectors, label: "Plan selector" },
        { names: watchlists.queries ?? [], registry: CONTENT_BUNDLE.queries, label: "Query" },
        { names: watchlists.siftingPatterns ?? [], registry: CONTENT_BUNDLE.siftingPatterns, label: "Sifting pattern" },
        { names: watchlists.tropes ?? [], registry: CONTENT_BUNDLE.tropes, label: "Trope" },
    ];
    for (const { names, registry, label } of watchlistEntries) {
        for (const constructName of names) {
            if (!(constructName in registry)) {
                throwAdapterValidationError(
                    `${label} '${constructName}' is on the watchlist, but is not defined in the content bundle`
                );
            }
        }
    }
}

/**
 * Throws a {@link VivValidationError} for an adapter validation failure.
 *
 * This is a convenience function that standardizes the error message and subject for all
 * adapter validation errors thrown in this module.
 *
 * @param detail - A description of the specific validation failure.
 * @throws Always.
 */
function throwAdapterValidationError(detail: string): never {
    throw new VivValidationError(
        "Adapter configuration issue",
        ValidationErrorSubject.Adapter,
        [detail]
    );
}
