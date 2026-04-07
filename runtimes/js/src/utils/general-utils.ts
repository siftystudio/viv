import isEqual from "lodash/isEqual";
import cloneDeep from "lodash/cloneDeep";

import { VivInternalError } from "../errors";

/**
 * Returns a random alphanumeric identifier of the given length.
 *
 * @param length - The number of characters for the random ID.
 * @returns A random alphanumeric identifier of the given length.
 */
export function randomID(length = 6): string {
    let id = '';
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const numberOfCharacters = characters.length;
    for (let i = 0; i < length; i++ ) {
        id += characters.charAt(Math.floor(Math.random() * numberOfCharacters));
    }
    return id;
}

/**
 * Returns a deep clone of the given value.
 *
 * This wrapper function exists to abstract the implementation from the rest of the runtime, in case
 * we want to swap it out later on, or vary the implementation based on the environment.
 *
 * @typeParam T - The type of value to be cloned.
 * @param value - The value to be cloned.
 * @returns A deep clone of the value.
 */
export function clone<T>(value: T): T {
    return cloneDeep(value);
}

/**
 * Returns a new array containing only the elements in the given array that are not equal to the given value.
 *
 * @typeParam T - The element type contained in the array.
 * @param array - The array to clone and filter.
 * @param value - The value to filter out in the new array.
 * @returns A new array containing only the elements in the given array that are not equal to the given value.
 */
export function removeAll<T>(array: readonly T[], value: T): T[] {
    return clone(array).filter(element => !isEqual(element, value));
}

/**
 * Returns a copy of the given array, with all duplicate elements removed.
 *
 * @typeParam T - The element type contained in the array.
 * @param array - The array to deduplicate.
 * @returns A copy of the given array, with all duplicate elements removed.
 */
export function deduplicate<T>(array: readonly T[]): T[] {
    return [...new Set(array)];
}

/**
 * Shuffles the given array in place, such that the elements will then appear in a pseudorandom order.
 *
 * @typeParam T - The element type contained in the array.
 * @param array - The array to shuffle.
 * @returns Nothing. The given array is shuffled in place.
 */
export function shuffle<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = array[i];
        array[i] = array[j];
        array[j] = tmp;
    }
}

/**
 * Returns a weighted-random permutation of the given items, derived using the given associated weights.
 *
 * Weights must be non-negative, and items with a weight of zero will appear last (in a random
 * ordering if there are multiple zero-weight items). This function uses the Gumbel-Max Trick.
 *
 * @typeParam T - The element type contained in the array.
 * @param items The items to sort in weighted-random order.
 * @param weights The non-negative weights associated with the items, such that, for any index `i`,
 *     `weights[i]` stores the weight for `items[i]`.
 * @returns A weighted-random permutation of the given items.
 * @throws {VivInternalError} If there is not the same number of items and weights (defensive guard).
 * @throws {VivInternalError} If an item has a negative weight (defensive guard).
 */
export function weightedShuffle<T>(items: readonly T[], weights: readonly number[]): T[] {
    // Apply the Gumbel-Max trick
    if (items.length !== weights.length) {
        throw new VivInternalError("Cannot perform weighted shuffle: different number of items and weights");
    }
    const indices = items.map((_, i) => i);
    shuffle(indices);
    const keyed = indices.map(i => {
        const item = items[i];
        const weight = weights[i];
        if (weight < 0) {
            throw new VivInternalError("Cannot perform weighted shuffle: encountered negative weight for item");
        }
        const logWeight = weight > 0 ? Math.log(weight) : -Infinity;  // Positive weights will always dominate
        const gumbelNoise = -Math.log(-Math.log(Math.random()));
        return {item, score: logWeight + gumbelNoise};
    });
    // Now sort on the derived values
    keyed.sort((a, b) => b.score - a.score);
    return keyed.map(key => key.item);
}

/**
 * Returns a number sampled from the specified normal distribution, optionally with clamping applied.
 *
 * This function employs the Marsaglia polar method and has been adapted from code available
 * at {@link https://gist.github.com/bluesmoon/7925696#file-marsaglia-polar-js}.
 *
 * @param mean - The mean parameterizing the normal distribution from which to sample.
 * @param sd - The standard deviation parameterizing the normal distribution from which to sample.
 * @param min - A minimum viable value (used for clamping).
 * @param max - A maximum viable value (used for clamping).
 * @returns A number sampled from the specified normal distribution, with clamping between `min` and `max`.
 */
export function randomNormal(
    mean: number,
    sd: number,
    min: number | null = null,
    max: number | null = null
): number {
    // Sample from a normal distribution in [0, 1)
    let value, u, v, s, mul;
    do {
        u = (Math.random() * 2) - 1;
        v = (Math.random() * 2) - 1;
        s = u * u + v * v;
    } while (s === 0 || s >= 1);
    mul = Math.sqrt(-2 * Math.log(s) / s);
    value = u * mul;
    // Skew to match the given mean and sd
    value = (value * sd) + mean
    // Fix up potential -0 value
    value = Object.is(value, -0) ? 0 : value;
    // Clamp to [min, max], as applicable
    value = clamp(value, min, max);
    // Return the final result
    return value;
}

/**
 * Clamps the given numeric value to the given range and returns the result.
 *
 * @param value - The numeric value to clamp.
 * @param min - If supplied, the minimum number on the clamping range.
 * @param max - If supplied, the maximum number on the clamping range.
 * @returns The given value, if it falls between `min` and `max`, else `max` if it exceeds `max`, else `min`.
 */
export function clamp(value: number, min: number | null = null, max: number | null = null): number {
    if (min !== null) {
        value = Math.max(min, value);
    }
    if (max !== null) {
        value = Math.min(max, value);
    }
    return value;
}

/**
 * Returns whether the given value is a boolean.
 *
 * @param value - The value whose status as a boolean will be tested.
 * @returns Whether the value is a boolean.
 */
export function isBoolean(value: unknown): value is boolean {
    return typeof value === "boolean";
}

/**
 * Returns whether the given value is a number.
 *
 * @param value - The value whose status as a number will be tested.
 * @returns Whether the value is a number.
 */
export function isNumber(value: unknown): value is number {
    return typeof value === "number" && !Number.isNaN(value);
}

/**
 * Returns whether the given value is a string.
 *
 * @param value - The value whose status as a string will be tested.
 * @returns Whether the value is a string.
 */
export function isString(value: unknown): value is string {
    return typeof value === "string";
}

/**
 * Returns whether the given value is an array.
 *
 * @param value - The value whose status as an array will be tested.
 * @returns Whether the value is an array.
 */
export function isArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
}

/**
 * Returns whether the given value is an array whose elements all pass the given type guard.
 *
 * This function also acts as a type guard: if `true` is returned, the caller can safely
 * treat the given value as an array of elements of the desired type.
 *
 * @typeParam T - The element type being checked.
 * @param value - The value whose status as an array of the desired type will be tested.
 * @param elementCheck - A type guard function that tests each element of the array.
 * @returns Whether the value is an array and each element passes `elementCheck`.
 */
export function isArrayOf<T>(value: unknown, elementCheck: (element: unknown) => element is T): value is T[] {
    return Array.isArray(value) && value.every(elementCheck);
}

/**
 * Returns whether the given value is a plain object (i.e. a key-value store).
 *
 * @param value - The value whose status as a plain object will be tested.
 * @returns Whether the value is a plain object.
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

