/**
 * Shared utilities for causal tree diagram rendering.
 *
 * These functions are used by both the single-anchor tree diagram module and the
 * sifting-match diagram module.
 */

import type { UID } from "../adapter/types";
import type { CachedActionData, ShortIDContext } from "./types";
import { VivInternalError } from "../errors";
import { getActionView } from "../utils";
import { TREE_CONTENT_STYLE, TREE_FRAME_STYLE } from "./constants";

/**
 * Fetches and caches the action data needed for tree rendering.
 *
 * @param actionID - Entity ID for the action to fetch.
 * @param cache - The cache to populate.
 * @returns The cached action data.
 */
export async function fetchAndCache(actionID: UID, cache: Map<UID, CachedActionData>): Promise<CachedActionData> {
    const existing = cache.get(actionID);
    if (existing !== undefined) {
        return existing;
    }
    const actionView = await getActionView(actionID);
    const data: CachedActionData = {
        name: actionView.name,
        caused: actionView.caused,
        causes: actionView.causes,
        timestamp: actionView.timestamp,
        ancestorCount: actionView.ancestors.length,
        descendantCount: actionView.descendants.length,
    };
    cache.set(actionID, data);
    return data;
}

/**
 * Recursively walks down from the given action, fetching and caching every descendant
 * reachable through `caused` links.
 *
 * @param actionID - Entity ID for the action to walk from.
 * @param actionCache - The cache to populate with action data.
 * @param discovered - The set of already-visited action IDs, mutated in place.
 */
export async function walkDescendants(
    actionID: UID,
    actionCache: Map<UID, CachedActionData>,
    discovered: Set<UID>
): Promise<void> {
    if (discovered.has(actionID)) {
        return;
    }
    discovered.add(actionID);
    const data = await fetchAndCache(actionID, actionCache);
    await Promise.all(data.caused.map(childID => walkDescendants(childID, actionCache, discovered)));
}

/**
 * Converts a zero-based index to a family letter (0 -> a, 1 -> b, ..., 25 -> z, 26 -> aa).
 *
 * @param index - The zero-based family index.
 * @returns The corresponding letter string.
 */
export function getFamilyLetter(index: number): string {
    let result = "";
    let remaining = index;
    do {
        result = String.fromCharCode(97 + (remaining % 26)) + result;
        remaining = Math.floor(remaining / 26) - 1;
    } while (remaining >= 0);
    return result;
}

/**
 * Assigns a compact short ID to the given action and records it in the legend.
 *
 * @param actionID - Entity ID for the action.
 * @param context - A context satisfying {@link ShortIDContext}.
 * @returns The assigned short ID.
 */
export function assignShortID(actionID: UID, context: ShortIDContext): string {
    const shortID = `${context.familyLetter}${context.familyNodeCounter}`;
    context.familyNodeCounter++;
    context.visited.set(actionID, shortID);
    context.legend.push([shortID, actionID]);
    return shortID;
}

/**
 * Returns the short ID assigned to the given action, throwing if it has not been assigned.
 *
 * @param actionID - Entity ID for the action.
 * @param context - A context satisfying {@link ShortIDContext}.
 * @returns The assigned short ID.
 * @throws {@link VivInternalError} If no short ID has been assigned (defensive guard).
 */
export function getShortID(actionID: UID, context: ShortIDContext): string {
    const shortID = context.visited.get(actionID);
    if (shortID === undefined) {
        throw new VivInternalError(`No short ID assigned for action: '${actionID}'`);
    }
    return shortID;
}

/**
 * Returns the cached data for the given action, throwing if it is missing from the cache.
 *
 * @param actionID - Entity ID for the action.
 * @param cache - The action data cache.
 * @returns The cached action data.
 * @throws {@link VivInternalError} If the action is not in the cache (defensive guard).
 */
export function getCachedData(actionID: UID, cache: Map<UID, CachedActionData>): CachedActionData {
    const data = cache.get(actionID);
    if (data === undefined) {
        throw new VivInternalError(`Action not found in cache during tree rendering: '${actionID}'`);
    }
    return data;
}

/**
 * Formats a back-reference fragment.
 *
 * @param label - The node label text.
 * @param shortID - The short ID being referenced.
 * @param ansi - Whether ANSI mode is enabled.
 * @returns The formatted back-reference string.
 */
export function formatBackRef(label: string, shortID: string, ansi: boolean): string {
    return styled(label, TREE_CONTENT_STYLE, ansi) + " " + styled(`[=${shortID}]`, TREE_FRAME_STYLE, ansi);
}

/**
 * Wraps text in the given ANSI escape code, if ANSI mode is enabled.
 *
 * @param text - The text to style.
 * @param code - The ANSI escape code to apply (e.g., {@link TREE_FRAME_STYLE}).
 * @param ansi - Whether ANSI mode is enabled.
 * @returns The styled (or unstyled) text.
 */
export function styled(text: string, code: string, ansi: boolean): string {
    return ansi ? `${code}${text}\x1b[0m` : text;
}
