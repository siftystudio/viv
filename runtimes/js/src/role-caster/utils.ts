import type { ConstructDefinition, RoleName } from "../content-bundle/types";
import type { ActionOrSelectorRoleCastingData, RoleCandidate, RoleCastingData, SymbolRoleBinding } from "./types";
import { ConstructDiscriminator } from "../content-bundle";
import { isArray, isBoolean, isNumber, isPlainObject, isString } from "../utils";

/**
 * Returns whether the given construct is of a type that uses an initiator role.
 *
 * @param constructDefinition - The construct definition being tested.
 * @returns Whether the given construct is of a type that uses an initiator role.
 */
export function isConstructWithInitiatorRole(
    constructDefinition: ConstructDefinition
): constructDefinition is Extract<
    ConstructDefinition,
    { type: ConstructDiscriminator.Action | ConstructDiscriminator.ActionSelector }
    > {
    return (
        constructDefinition.type === ConstructDiscriminator.Action
        || constructDefinition.type === ConstructDiscriminator.ActionSelector
    );
}

/**
 * Returns whether the given construct definition is a sifting pattern that has
 * the given role name among its `action` roles.
 *
 * @param roleName - The name of the role in question
 * @param constructDefinition - The construct definition in question.
 * @returns Whether this is an `actions` role in a sifting pattern.
 */
export function isSiftingPatternActionRole(roleName: RoleName, constructDefinition: ConstructDefinition): boolean {
    if (constructDefinition.type === ConstructDiscriminator.SiftingPattern) {
        if (constructDefinition.actions.includes(roleName)) {
            return true;
        }
    }
    return false;
}

/**
 * Returns a canonical key for the given role candidate or quorum.
 *
 * This key is used for sorting purposes and also to compare against the blacklist during role casting.
 *
 * Note that this function is not persnickety about canonicalizing complex symbol values like
 * arrays or objects, since this would require depth-first traversal that would be overkill.
 *
 * @param candidateOrQuorum - The candidate or role quorum for whom a canonical key will be derived.
 * @returns A canonical key for the given candidate or quorum.
 */
export function getCanonicalRoleCandidatesKey(
    candidateOrQuorum: RoleCandidate | RoleCandidate[]
): string {
    if (isArray(candidateOrQuorum)) {
        return JSON.stringify(candidateOrQuorum.slice().sort());
    } else if (isString(candidateOrQuorum)) {
        return candidateOrQuorum;
    } else if (candidateOrQuorum === null || isBoolean(candidateOrQuorum) || isNumber(candidateOrQuorum)) {
        return String(candidateOrQuorum);
    }
    // If we get to here, it's a plain object
    return JSON.stringify(candidateOrQuorum);
}

/**
 * Lazily enumerates the unordered size-`k` combinations drawn from `pool`.
 *
 * If `k` is 0, this generator yields a single empty combination (`[]`). And if `k`
 * is negative or greater than `pool.length`, it yields nothing.
 *
 * Note: This function assumes that `pool` contains no duplicates.
 *
 * @typeParam T - The element type of the source array (and thereby the combinations).
 * @param pool - A deduplicated source array from which the combinations will be derived.
 * @param k - The number of elements per combination.
 * @returns Yields one k-combination (array) per iteration.
 */
export function* kCombinations<T>(pool: readonly T[], k: number): Generator<T[], void> {
    // If the request is impossible, yield nothing
    const n = pool.length;
    if (k < 0 || k > n) {
        return;
    }
    // If `k` is zero, simply return the empty set now
    if (k === 0) {
        yield [];
        return;
    }
    // Initialize an index vector
    const indexVector: number[] = new Array<number>(k);
    for (let i = 0; i < k; i++) {
        indexVector[i] = i;
    }
    // Enumerate combinations of the indices in this vector, in lexicographic order
    while (true) {
        // Map the current indices to elements and yield the combination
        const pick = indexVector.map((i) => pool[i]);
        yield pick;
        // Find the rightmost position that can be incremented
        let position = k - 1;
        while (position >= 0) {
            const maxAtPosition = (n - k) + position;
            if (indexVector[position] === maxAtPosition) {
                position -= 1;
            } else {
                break;
            }
        }
        // If no position can be incremented, our work is done
        if (position < 0) {
            return;
        }
        // Otherwise, increment the chosen position and reset the tail
        indexVector[position] += 1;
        for (let j = position + 1; j < k; j++) {
            indexVector[j] = indexVector[j - 1] + 1;
        }
    }
}

/**
 * Returns whether the given value is a valid binding candidate (apparent entity ID or a symbol-role binding).
 *
 * @param value - The value whose status as a valid binding candidate will be tested.
 * @returns Whether the given value is a valid binding candidate.
 */
export function isRoleCandidate(value: unknown): value is RoleCandidate {
    return isString(value) || isSymbolRoleBinding(value);
}

/**
 * Returns whether the given value is a valid binding for a symbol role.
 *
 * @param value - The value whose status as a valid symbol-role binding will be tested.
 * @returns Whether the given value is a valid binding for a symbol role.
 */
export function isSymbolRoleBinding(value: unknown): value is SymbolRoleBinding {
    return value === null
        || isString(value)
        || isNumber(value)
        || typeof value === "boolean"
        || isArray(value)
        || isPlainObject(value);
}

/**
 * Returns whether the given role-casting data is specifically action role-casting data.
 *
 * @param roleCastingData - The role-casting data in question.
 * @returns Whether the given role-casting data is specifically action role-casting data.
 */
export function isActionOrSelectorRoleCastingData(
    roleCastingData: RoleCastingData
): roleCastingData is ActionOrSelectorRoleCastingData {
    if (roleCastingData.initiatorLevelCache === undefined) {
        return false;
    }
    return roleCastingData.constructDefinition.type === ConstructDiscriminator.Action
        || roleCastingData.constructDefinition.type === ConstructDiscriminator.ActionSelector;
}
