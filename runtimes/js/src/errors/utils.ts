import { ConstructDiscriminator } from "../content-bundle";
import { VivInternalError } from "./errors";

/**
 * Returns a label for the given construct type that is suitable for use in an error message.
 *
 * @param constructType - The construct type in question.
 * @returns A label for the given construct type.
 * @throws {VivInternalError} If the construct type is invalid (defensive guard).
 */
export function getConstructLabel(constructType: ConstructDiscriminator): string {
    switch (constructType) {
        case ConstructDiscriminator.Action:
            return "action";
        case ConstructDiscriminator.ActionSelector:
            return "action selector";
        case ConstructDiscriminator.Plan:
            return "plan";
        case ConstructDiscriminator.PlanSelector:
            return "plan selector";
        case ConstructDiscriminator.Query:
            return "query";
        case ConstructDiscriminator.SiftingPattern:
            return "sifting pattern";
        case ConstructDiscriminator.Trope:
            return "trope";
        default:
            throw new VivInternalError(`Invalid construct type: '${constructType}'`)
    }
}

/**
 * Returns the given text wrapped in red ANSI escape codes, if colors are enabled, else unwrapped.
 *
 * @param text - The text to stylize.
 * @param options - An object indicating whether colors are enabled. When applicable,
 *     this will be the Node inspect options at hand.
 * @returns The given text wrapped in red ANSI escape codes, as applicable.
 */
export function red(text: string, options: { colors: boolean }): string {
    return useColors(options) ? `\x1b[31m${text}\x1b[0m` : text;
}

/**
 * Returns the given text wrapped in yellow ANSI escape codes, if colors are enabled, else unwrapped.
 *
 * @param text - The text to stylize.
 * @param options - An object indicating whether colors are enabled. When applicable,
 *     this will be the Node inspect options at hand.
 * @returns The given text wrapped in yellow ANSI escape codes, as applicable.
 */
export function yellow(text: string, options: { colors: boolean }): string {
    return useColors(options) ? `\x1b[33m${text}\x1b[0m` : text;
}

/**
 * Returns the given text wrapped in dim ANSI escape codes, if colors are enabled, else unwrapped.
 *
 * @param text - The text to stylize.
 * @param options - An object indicating whether colors are enabled. When applicable,
 *     this will be the Node inspect options at hand.
 * @returns The given text wrapped in dim ANSI escape codes, as applicable.
 */
export function dim(text: string, options: { colors: boolean }): string {
    return useColors(options) ? `\x1b[2m${text}\x1b[0m` : text;
}

/**
 * Returns whether color output should be used, which depends on the inspect options
 * and also the `NO_COLOR` environment variable.
 *
 * See {@link https://no-color.org} for information about the `NO_COLOR` standard.
 *
 * @param options - An object indicating whether colors are enabled. When applicable,
 *     this will be the Node inspect options at hand.
 * @returns Whether color output should be used.
 */
function useColors(options: { colors: boolean }): boolean {
    const noColor = (globalThis as any)['process']?.['env']?.['NO_COLOR'];
    return options.colors && !noColor;
}
