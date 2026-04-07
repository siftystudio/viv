import type { UID } from "../adapter/types";
import type { CastingPool, ConstructDefinition, RoleDefinition, RoleName } from "../content-bundle/types";
import type { EvaluationContext } from "../interpreter/types";
import type { SearchDomain } from "../story-sifter/types";
import type {
    DynamicRoleCastingData,
    InitiatorLevelCache,
    RoleBindings,
    RoleCandidate,
    RoleCastingData,
    RoleCastingResult,
    RoleCastingResultFailure,
    RoleCastingResultSuccess
} from "./types";
import { getViolatedEmbargo } from "../action-manager";
import { EntityType } from "../adapter";
import { RoleEntityType, RoleParticipationMode } from "../content-bundle";
import {
    recordBacktrackingReason,
    recordCastingAttempt,
    recordConditionTestResult,
    RoleCastingBacktrackReason
} from "../debugger";
import { GATEWAY } from "../gateway";
import { VivInternalError, VivRoleCastingError } from "../errors";
import {
    dehydrateExpressionValue,
    EVAL_FAIL_SAFE_SENTINEL,
    interpretExpression,
    isTruthy,
    prepareEvaluationContext
} from "../interpreter";
import {
    clone,
    deduplicate,
    getRoleDefinition,
    isArray,
    isArrayOf,
    isPlainObject,
    isString,
    randomNormal,
    shuffle
} from "../utils";
import {
    getCanonicalRoleCandidatesKey,
    isActionOrSelectorRoleCastingData,
    isRoleCandidate,
    isSiftingPatternActionRole,
    isSymbolRoleBinding,
    kCombinations
} from "./utils";

/**
 * Attempts to produce a valid final cast for the construct targeted in the given role-casting data.
 *
 * This function works by proceeding through the *role-dependency forest* for the target construct,
 * one tree at a time. Within a given tree, we work through the roles in a depth-first manner,
 * backtracking in the opposite direction as needed.
 *
 * @param constructDefinition - Definition for the construct being targeted.
 * @param precastBindings - Precast (partial) bindings asserted prior to targeting, if any, else an empty
 *     object. These bindings must be honored as a subset of any bindings constructed during targeting.
 * @param initiatorLevelCache - (Optional) For action (selector) targeting only, a cache containing data
 *     that only needs to be reset between prospective initiators. Its life cycle is implemented by the
 *     action manager, but all the updates are made during role casting.
 * @param searchDomain - If this is a query or a sifting pattern, the search domain to use when casting
 *     its roles. This is needed to limit results to only include actions that are present in the domain.
 * @param suppressConditions - Whether to ignore the action conditions during role casting. This supports
 *     the public API function {@link attemptActionAPI}, which allows callers to effectively force an action.
 * @returns An object containing final valid final bindings (if casting succeeds, else `null`),
 *     along with the final evaluation context.
 */
export async function castRoles(
    constructDefinition: ConstructDefinition,
    precastBindings: RoleBindings,
    searchDomain: SearchDomain | null,
    initiatorLevelCache?: InitiatorLevelCache,
    suppressConditions?: boolean
): Promise<RoleCastingResult> {
    // Now prepare an object containing frequently needed role-casting data
    const roleCastingData = prepareRoleCastingData(
        constructDefinition,
        precastBindings,
        searchDomain,
        initiatorLevelCache,
        suppressConditions
    );
    // Prepare a result that will be returned if targeting fails
    const failureResult: RoleCastingResultFailure = { bindings: null };
    // Now test the construct's global conditions, if any. If these do not hold, return `null` bindings now.
    if (!(await globalConditionsHold(roleCastingData))) {
        await recordBacktrackingReason(
            roleCastingData.constructDefinition,
            null,
            RoleCastingBacktrackReason.GlobalConditionsFailed
        );
        return failureResult;
    }
    // If those hold, attempt to assemble a minimal cast for the construct at hand. We can do this by
    // casting in turn each of the tree roots in the construct's role-dependency forest. This works
    // because casting a given role entails casting all its downstream roles.
    let updatedBindings: RoleBindings | null;
    for (const dependencyTreeRootName of roleCastingData.constructDefinition.roleForestRoots) {
        updatedBindings = await castRole(roleCastingData, dependencyTreeRootName);
        // If a bindings of `null` reaches us here, we've exhaustively searched the full space of possible
        // bindings for the dependency tree at hand, to no avail, so we must abandon casting now.
        if (updatedBindings === null) {
            return failureResult;
        }
        roleCastingData.currentBindings = updatedBindings;  // Not necessary, but good to be explicit
    }
    // If we get to here, we have a minimal cast. Next, we'll attempt to fill optional role slots. This
    // applies in cases where a role has a `max` property that is greater than its `min` property (common
    // for bystander roles). For this phase, we don't backtrack, so we don't need to traverse the dependency
    // structure. Instead, we'll traverse the roles in the order in which the author defined them, under the
    // notion that a) a candidate should be cast in the most specific role possible, and b) authors write
    // roles in descending order of specificity. Note that targeting will now succeed unless we have
    // outstanding precast candidates that cannot be cast in the applicable optional role slots.
    for (const roleName in roleCastingData.constructDefinition.roles) {
        const bindings = await castRole(roleCastingData, roleName, true);
        if (bindings === null) {
            // During optional-slot filling, the only failure case is this: there are outstanding precast
            // candidates that could not be placed in the applicable optional role slots. If this has
            // occurred, we will get a bindings of `null`, which we need to pass on to cue failure.
            return failureResult;
        }
        roleCastingData.currentBindings = bindings;  // Again, not necessary, but good to be explicit
    }
    // If we make it to the end here, targeting has succeeded, and we can now return the final bindings
    const successResult: RoleCastingResultSuccess = {
        bindings: roleCastingData.currentBindings,
        evaluationContext: roleCastingData.evaluationContext
    };
    return successResult;
}

/**
 * Returns an object containing initial role-casting data.
 *
 * This object contains frequently needed data and is thus expected in many of the
 * role-casting functions, in lieu of long function signatures.
 *
 * @param constructDefinition - Definition for the construct being targeted.
 * @param precastBindings - Precast (partial) bindings asserted prior to targeting, if any, else an empty
 *     object. These bindings must be honored as a subset of any bindings constructed during targeting.
 * @param initiatorLevelCache - (Optional) For action (selector) targeting only, a cache containing data
 *     that only needs to be reset between prospective initiators. Its life cycle is implemented by the
 *     action manager, but all the updates are made during role casting.
 * @param searchDomain - If this is a query or a sifting pattern, the search domain to use when casting
 *     its roles. This is needed to limit results to only include actions that are present in the domain.
 * @param suppressConditions - Whether to ignore the action conditions during role casting. This supports
 *     the public API function {@link attemptActionAPI}, which allows callers to effectively force an action.
 * @returns An object containing initial role-casting data.
 */
function prepareRoleCastingData(
    constructDefinition: ConstructDefinition,
    precastBindings: RoleBindings,
    searchDomain: SearchDomain | null,
    initiatorLevelCache?: InitiatorLevelCache,
    suppressConditions?: boolean
): RoleCastingData {
    const evaluationContext = prepareEvaluationContext(constructDefinition.type, constructDefinition.name);
    if (searchDomain) {
        evaluationContext.__searchDomain__ = searchDomain;
    }
    const roleCastingData: RoleCastingData = {
        constructDefinition,
        precastBindings,
        currentBindings: {},
        evaluationContext,
        targetingCache: {
            pools: {},
            blacklists: {}
        },
        ...(initiatorLevelCache !== undefined ? { initiatorLevelCache } : {}),
        ...(suppressConditions === true ? { suppressConditions } : {}),
    };
    return roleCastingData;
}

/**
 * Returns whether the given construct's global conditions hold.
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @returns Whether the given construct's global conditions hold.
 */
async function globalConditionsHold(roleCastingData: RoleCastingData): Promise<boolean> {
    // If condition testing is suppressed, return `true` now
    if (roleCastingData.suppressConditions) {
        return true;
    }
    // Otherwise, test the global conditions in turn
    for (const condition of roleCastingData.constructDefinition.conditions.globalConditions) {
        const evaluation = await interpretExpression(
            condition.body,
            roleCastingData.evaluationContext,
            true
        );
        if (!isTruthy(evaluation)) {
            await recordConditionTestResult(roleCastingData.constructDefinition, condition.body, false);
            return false;
        } else {
            await recordConditionTestResult(roleCastingData.constructDefinition, condition.body, true);
        }
    }
    return true;
}

/**
 * Attempts to cast the given role by filling all applicable role slots.
 *
 * If the given role has multiple required role slots (i.e., a `min` greater than `1`), all such
 * required slots will have to be filled in order for casting to succeed. If we are filling optional
 * slots, we will attempt to fill all available slots, but casting succeeds no matter what.
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @param roleName - Name of the role we are attempting to cast.
 * @param fillingOptionalSlots - Whether we are currently filling optional role slots, meaning slots beyond
 *     the minimum required number specified in the role definition.
 * @returns Updated bindings, if casting succeeds, else `null`.
 * @throws {VivInternalError} If the role-casting data becomes malformed (defensive guard).
 */
async function castRole(
    roleCastingData: RoleCastingData,
    roleName: RoleName,
    fillingOptionalSlots = false
): Promise<RoleBindings | null> {
    // Retrieve the role definition
    const roleDefinition = getRoleDefinition(roleCastingData.constructDefinition, roleName);
    // If this is a `spawn` role, we do not need to cast it because we will construct a new entity to play
    // the role, should targeting succeed. As such, we can return the bindings as is, to cue success.
    if (roleDefinition.spawn) {
        return roleCastingData.currentBindings;
    }
    // Otherwise, record the casting attempt, as applicable
    await recordCastingAttempt(roleCastingData.constructDefinition, roleName);
    // Add this role into the bindings, if needed
    roleCastingData.currentBindings[roleName] ??= [];
    // Get the number of role slots to fill
    let nRemainingSlots = getNumberOfRoleSlotsToFill(roleCastingData, roleName, fillingOptionalSlots);
    // If there are no remaining slots to fill, we can return the current bindings as is, to cue success
    if (!nRemainingSlots) {
        return roleCastingData.currentBindings;
    }
    // If we must fill more than one required slot, we need to carry out a special process that is dedicated to
    // roles with "quorums" -- i.e., more than one required slot. Note that not all group roles are quorum roles,
    // since group roles might have different profiles (e.g. `{min: 0, max: 2}` vs. `{min: 1, max: 3}`).
    if (!fillingOptionalSlots && nRemainingSlots > 1) {
        return await castRoleQuorum(roleCastingData, roleName);
    }
    // Assemble any candidates already cast in this role, along with any outstanding precast candidates
    const alreadyCastInRole = roleCastingData.currentBindings[roleName];
    if (!isArrayOf<RoleCandidate>(alreadyCastInRole, isRoleCandidate)) {
        throw new VivInternalError("Role bindings is not an array of binding candidates");
    }
    const precastCandidates = roleCastingData.precastBindings[roleName] ?? [];
    const outstandingPrecastCandidates = precastCandidates.filter(candidate => !alreadyCastInRole.includes(candidate));
    // If we are filling optional slots, we don't want something like a role-slots mean to prevent us
    // from using all our precast candidates. In such cases, only the actual role max should be honored.
    if (fillingOptionalSlots) {
        const remainingCapacity = roleDefinition.max - alreadyCastInRole.length;
        if (outstandingPrecastCandidates.length > remainingCapacity) {
            await recordBacktrackingReason(
                roleCastingData.constructDefinition,
                roleName,
                RoleCastingBacktrackReason.OutstandingPrecastCandidate
            );
            return null;
        }
        if (nRemainingSlots < outstandingPrecastCandidates.length) {
            nRemainingSlots = outstandingPrecastCandidates.length;
        }
    }
    // Now let's construct our casting pool
    let pool: RoleCandidate[];
    // If this role has the `precast` label, it can only ever be cast via the bindings in a reaction
    // declaration, so we'll need to treat the remaining precast candidates as our casting pool.
    if (roleDefinition.precast) {
        // Otherwise, that's our pool
        pool = outstandingPrecastCandidates;
    } else {
        // This isn't a precast role, so we'll derive a casting pool in the normal manner
        const rolePool = await getCastingPoolForRole(roleCastingData, roleName);
        // Though we do need to confirm that any and all precast candidates are included in the
        // casting pool. If any precast candidate is not included, we'll return `null` now.
        for (const precastCandidate of outstandingPrecastCandidates) {
            if (!rolePool.includes(precastCandidate)) {
                await recordBacktrackingReason(
                    roleCastingData.constructDefinition,
                    roleName,
                    RoleCastingBacktrackReason.PrecastCandidateNotInPool
                );
                return null;
            }
        }
        // Now construct the pool. We'll place the precast candidates first, so we can easily detect
        // a failure to cast a precast candidate. Following them will be all candidates in the role
        // pool that are not already cast or among the outstanding precast candidates.
        const availableRolePool = rolePool.filter(
            candidate => !outstandingPrecastCandidates.includes(candidate) && !alreadyCastInRole.includes(candidate)
        );
        pool = outstandingPrecastCandidates.concat(availableRolePool);
    }
    // If the pool does not contain enough candidates, we need to return `null` now, unless
    // we're filling optional slots, in which case we'll consider as many as we can.
    if (pool.length < nRemainingSlots) {
        if (!fillingOptionalSlots) {
            await recordBacktrackingReason(
                roleCastingData.constructDefinition,
                roleName,
                RoleCastingBacktrackReason.PoolTooSmall
            );
            return null;
        }
        nRemainingSlots = pool.length;
    }
    // Otherwise, it's time to cast this role. Let's proceed through the pool, one candidate at a time, attempting
    // to place the candidate in a slot for this role. Here, there is a single potential failure case: we are
    // casting for a single required slot, and we are unable to find any satisficing candidate. In this case,
    // we will return `null` (to trigger backtracking). In all other cases, we will return updated bindings.
    for (const [poolIndex, candidate] of pool.entries()) {
        // Attempt to cast the entity in this role
        const updatedBindings = await attemptToCastRoleCandidate(
            roleCastingData,
            candidate,
            roleName,
            fillingOptionalSlots
        );
        // If we get back null, we could not cast this entity in this role at this time
        if (updatedBindings === null) {
            // If this was a precast entity that we failed to cast, we must return `null` now to indicate a
            // failure to cast this role as specified. Note that this is true regardless of whether we are
            // casting optional slots.
            if (poolIndex < outstandingPrecastCandidates.length) {
                await recordBacktrackingReason(
                    roleCastingData.constructDefinition,
                    roleName,
                    RoleCastingBacktrackReason.PrecastCandidateCouldNotBeCast
                );
                return null;
            }
            continue;
        }
        roleCastingData.currentBindings = updatedBindings;
        nRemainingSlots--;
        if (!nRemainingSlots) {
            return roleCastingData.currentBindings;
        }
    }
    // If we get to here while we're filling optional slots, all is well, we just didn't fill all the possible
    // optional slots -- we maybe even filled none. In any event, we can return the bindings and call it a day
    // for this role (for now, at least).
    if (fillingOptionalSlots) {
        return roleCastingData.currentBindings;
    }
    // If we are not filling optional slots, however, reaching this point means that we could not fill all
    // the required slots for this role, in which case we need to return null, to cue failure. Note that
    // we already reverted the bindings and evaluation context upon each failure, so there's no need to
    // do any further restoration now.
    await recordBacktrackingReason(
        roleCastingData.constructDefinition,
        roleName,
        RoleCastingBacktrackReason.MinSlotsNotFilled
    );
    return null;
}

/**
 * Returns the number of role slots to be filled in the current attempt to cast the given role.
 *
 * This procedure takes into account any distribution declarations contained in a role definition.
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @param roleName - Name of the role we are attempting to cast.
 * @param fillingOptionalSlots - Whether we are currently filling optional role slots, meaning slots beyond
 *     the minimum required number specified in the role definition.
 * @returns The number of role slots to be filled in the current attempt to cast the given role.
 */
function getNumberOfRoleSlotsToFill(
    roleCastingData: RoleCastingData,
    roleName: RoleName,
    fillingOptionalSlots: boolean
): number {
    // Retrieve the role definition
    const roleDefinition = getRoleDefinition(roleCastingData.constructDefinition, roleName);
    // If we're not filling optional slots, we need to fill precisely the minimum number required
    if (!fillingOptionalSlots) {
        return roleDefinition.min;
    }
    // Otherwise, we can fill up to the max. But if there's an author-supplied curve for this
    // role, we need to determine the de facto max value for this targeting instance.
    let effectiveMax = roleDefinition.max;
    if (roleDefinition.mean !== null && roleDefinition.sd !== null) {
        effectiveMax = randomNormal(
            roleDefinition.mean,
            roleDefinition.sd,
            roleDefinition.min,
            roleDefinition.max
        );
        effectiveMax = Math.round(effectiveMax);
    } else if (roleDefinition.chance !== null) {
        // We also need to honor any chance directive on the role, which assigns a probability that each optional
        // slot will be filled. We pre-compute the number of slots to fill by running an independent coin flip
        // for each optional slot, which is equivalent to testing each candidate individually as they qualify.
        effectiveMax = roleDefinition.min;
        for (let i = roleDefinition.min; i < roleDefinition.max; i++) {
            if (Math.random() >= roleDefinition.chance) {
                continue;
            }
            effectiveMax++;
        }
    }
    // Finally, consider how many slots have already been filled, and return the number of remaining slots
    const nFilledSlots = roleCastingData.currentBindings[roleName]?.length ?? 0;
    const nRemainingSlots = Math.max(effectiveMax - nFilledSlots, 0);
    return nRemainingSlots;
}

/**
 * Attempts to cast a *quorum* of candidates, meaning a group filling the
 * minimum number of required slots for the given role.
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @param roleName - Name of the role we are attempting to cast.
 * @returns Updated bindings, if casting succeeds, else `null`.
 */
async function castRoleQuorum(
    roleCastingData: RoleCastingData,
    roleName: RoleName
): Promise<RoleBindings | null> {
    // Retrieve the role definition
    const roleDefinition = getRoleDefinition(roleCastingData.constructDefinition, roleName);
    const quorumSize = roleDefinition.min;
    // Isolate any precast candidates, meaning ones that were already "precast" via a reaction declaration
    const precastCandidates = roleCastingData.precastBindings[roleName] ?? [];
    // While this is also enforced at action queueing, because it's cheap, we'll quickly confirm
    // here that we don't have more precast candidates than the maximum number of role slots.
    if (precastCandidates.length > roleDefinition.max) {
        await recordBacktrackingReason(
            roleCastingData.constructDefinition,
            roleName,
            RoleCastingBacktrackReason.OutstandingPrecastCandidate
        );
        return null;
    }
    // Unless this is a precast role, retrieve the casting pool for this role. A precast role can only be
    // cast using existing bindings, and the compiler will enforce that such a role never has a custom pool.
    let pool: RoleCandidate[] = [];
    if (!roleDefinition.precast) {
        pool = await getCastingPoolForRole(roleCastingData, roleName);
        // We also need to confirm that any and all precast candidates are included in the
        // casting pool. If any precast candidate is not included, we'll return `null` now.
        for (const precastCandidate of precastCandidates) {
            if (!pool.includes(precastCandidate)) {
                await recordBacktrackingReason(
                    roleCastingData.constructDefinition,
                    roleName,
                    RoleCastingBacktrackReason.PrecastCandidateNotInPool
                );
                return null;
            }
        }
    }
    // The precast candidates passed this test. If there are additional role slots to fill beyond the ones
    // that were precast, we need to modify the pool so that it contains only such additional candidates.
    // This entails simply removing the precast candidates from the pool. (Note that this is not necessary
    // when we have a full quorum precast, which is why we can skip doing it in such cases.)
    if (precastCandidates.length < quorumSize) {
        pool = pool.filter(candidate => !precastCandidates.includes(candidate));
        // If the pool is now too small to fill additional quorum slots, we can return `null` now,
        // because it will be impossible to cast the rest of the quorum.
        if (pool.length < (quorumSize - precastCandidates.length)) {
            await recordBacktrackingReason(
                roleCastingData.constructDefinition,
                roleName,
                RoleCastingBacktrackReason.PoolTooSmall
            );
            return null;
        }
    }
    // It's time to fill these required role slots. While in `castRole()` we can consider candidates one by one,
    // here we must search through the space of possible role quorums, where each quorum is a combination spanning
    // our N slots, with a distinct entity (from the role pool) in each slot. If we were to fill each slot one by
    // one, like we do with optional slots in group roles, we would not end up exploring the full combinatorial
    // space, which means we could reject a construct when in fact there was a viable bindings for it. This is
    // why we need this distinct method. Note that we don't need to do any special check here to ensure that all
    // precast entities are included, since we've done this already as part of our procedure for yielding the
    // space of possible role quorums. Further, that procedure never produces a set containing duplicates, so
    // we don't need to worry about that here either.
    const allPossibleRoleQuorums = getAllPossibleRoleQuorums(precastCandidates, pool, quorumSize);
    for (const roleQuorum of allPossibleRoleQuorums) {
        // Now attempt to cast the quorum in this role
        const updatedBindings = await attemptToCastRoleQuorum(roleCastingData, roleName, roleQuorum);
        // If we didn't receive `null` here, the quorum worked, so let's return the updated bindings now. If we do
        // receive `null`, the quorum didn't work out, so let's move onto the next one (i.e., the next iteration).
        if (updatedBindings !== null) {
            return updatedBindings;
        }
    }
    // If we get to here, we were not able to find a viable quorum, so we need to return `null` now
    await recordBacktrackingReason(
        roleCastingData.constructDefinition,
        roleName,
        RoleCastingBacktrackReason.MinSlotsNotFilled
    );
    return null;
}

/**
 * Lazily yields all possible role quorums constructed from the given precast candidates and/or casting pools.
 *
 * This function assumes the following:
 *  - The precast candidates have already been validated.
 *  - There are no duplicate precast candidates.
 *  - The casting pool does not contain any precast candidates.
 *  - The casting pool is also deduplicated.
 *
 * @param precastCandidates - Array containing any candidates that have been precast in this role. If there
 *     are no such precast candidates, as is typically the case, this will be an empty array.
 * @param castingPool - Array containing additional candidates for the role.
 * @param numberOfSlots - The number of slots to fill during the current attempt to cast the role.
 * @returns Yields a single array representing one candidate role quorum.
 */
function* getAllPossibleRoleQuorums(
    precastCandidates: RoleCandidate[],
    castingPool: RoleCandidate[],
    numberOfSlots: number
): Generator<RoleCandidate[], void> {
    // If all required slots can be drawn from the precast candidates, we need to enumerate all possible
    // `numberOfSlots`-sized subsets of those candidates. We will then attempt to cast any additional
    // precast candidates via optional role slots. (Note that a reaction cannot be queued if there
    // are more precast candidates for a role than its max number of slots.)
    if (precastCandidates.length >= numberOfSlots) {
        for (const subset of kCombinations<RoleCandidate>(precastCandidates, numberOfSlots)) {
            yield subset;
        }
        return;
    }
    // Otherwise, we will produce quorums that always subsume all precast candidates, using the general candidate
    // pool as a source for required role slots beyond what was precast. For the most typical case, where there
    // are no precast candidates at all, the combinations will be constructed exclusively from the pool.
    const numberOfOutstandingSlots = numberOfSlots - precastCandidates.length;
    for (const combo of kCombinations<RoleCandidate>(castingPool, numberOfOutstandingSlots)) {
        yield [...precastCandidates, ...combo];
    }
}

/**
 * Attempts to cast the given *quorum* in the given role.
 *
 * Here, a 'quorum' is a set of N entities to be cast in this role, where N is precisely the role's
 * minimum number of required entities.
 *
 * Note that this may require recursive casting of downstream roles, meaning roles that are descendants
 * of this one in the role-dependency tree that structures role casting.
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @param roleName - Name of the role we are attempting to cast.
 * @param roleQuorum - A role quorum, in the form of an array containing the minimum number of entities
 *     required for successfully casting the given role.
 * @returns Updated bindings, if casting succeeds, else `null`.
 */
async function attemptToCastRoleQuorum(
    roleCastingData: RoleCastingData,
    roleName: RoleName,
    roleQuorum: RoleCandidate[]
): Promise<RoleBindings | null> {
    // Before we get started, let's take a snapshot of the dynamic role-casting data that will be
    // mutated as we attempt to cast this role candidate. If anything goes wrong, either with the
    // candidate or something downstream, we'll backtrack to here and restore the snapshot data.
    const dynamicRoleCastingDataSnapshot: DynamicRoleCastingData = {
        currentBindings: clone<RoleBindings>(roleCastingData.currentBindings),
        evaluationContext: clone<EvaluationContext>(roleCastingData.evaluationContext)
    };
    // Determine whether the quorum can play the role (together), modulo any downstream concerns
    const quorumCanPlayRole = await quorumFitsRole(roleCastingData, roleQuorum, roleName);
    // If not, due to a failed condition or embargo or another immediate reason, let's
    // return `null` now, after first undoing changes to the bindings and evaluation context.
    if (!quorumCanPlayRole) {
        backtrack(roleCastingData, dynamicRoleCastingDataSnapshot);
        return null;
    }
    // If the quorum does fit the role, we'll consider its members *temporarily* bound to the role
    // as we attempt to cast any downstream roles. If issues arise downstream, we'll backtrack to
    // here and remove the quorum from the bindings before returning null.
    roleCastingData.currentBindings[roleName] = [...roleQuorum];
    const updatedBindings = await castDownstreamRoles(roleCastingData, roleName);
    // If we receive `null` here, this quorum cannot be cast in this role due to downstream issues, in which
    // case we must return `null` now, after first undoing changes to the bindings and evaluation context.
    if (updatedBindings === null) {
        await recordBacktrackingReason(
            roleCastingData.constructDefinition,
            roleName,
            RoleCastingBacktrackReason.DownstreamFailure
        );
        backtrack(roleCastingData, dynamicRoleCastingDataSnapshot);
        return null;
    }
    // If we didn't receive `null`, there were no downstream issues, so let's return the updated bindings
    return updatedBindings;
}

/**
 * Returns whether the given quorum may be cast together in the given role (modulo potential downstream issues).
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @param roleQuorum - A role quorum, in the form of an array containing the minimum number of entities
 *     required for successfully casting the given role.
 * @param roleName - Name of the role we are attempting to cast.
 * @returns Whether the given role quorum may be cast together in the given role.
 */
async function quorumFitsRole(
    roleCastingData: RoleCastingData,
    roleQuorum: RoleCandidate[],
    roleName: RoleName,
): Promise<boolean> {
    // If this quorum is blacklisted from this role, return `false` immediately
    if (quorumIsBlacklistedFromRole(roleCastingData, roleQuorum, roleName)) {
        await recordBacktrackingReason(
            roleCastingData.constructDefinition,
            roleName,
            RoleCastingBacktrackReason.BlacklistedQuorum
        );
        return false;
    }
    // If any candidate in the quorum does not meet the general criteria for this role,
    // return `false` now (though don't blacklist the quorum).
    for (const candidate of roleQuorum) {
        const candidateCanPlayRole = await candidateFitsRole(
            roleCastingData,
            candidate,
            roleName,
            true
        );
        if (!candidateCanPlayRole) {
            await recordBacktrackingReason(
                roleCastingData.constructDefinition,
                roleName,
                RoleCastingBacktrackReason.QuorumMemberFailedConditions
            );
            return false;
        }
    }
    // Now return whether the conditions hold
    const quorumFailedRoleConditions = await quorumFailsRoleConditions(roleCastingData, roleQuorum, roleName);
    if (quorumFailedRoleConditions) {
        await recordBacktrackingReason(
            roleCastingData.constructDefinition,
            roleName,
            RoleCastingBacktrackReason.QuorumFailedConditions
        );
        return false;
    }
    return true;
}

/**
 * Returns whether the given quorum is currently blacklisted from being cast together in the given role.
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @param roleQuorum - A role quorum, in the form of an array containing the minimum number of entities
 *     required for successfully casting the given role.
 * @param roleName - Name of the role we are attempting to cast.
 * @returns Whether the given role quorum is currently blacklisted from the given role.
 */
function quorumIsBlacklistedFromRole(
    roleCastingData: RoleCastingData,
    roleQuorum: RoleCandidate[],
    roleName: RoleName
): boolean {
    const blacklistKey = getCanonicalRoleCandidatesKey(roleQuorum);
    return Boolean(roleCastingData.targetingCache.blacklists[blacklistKey]?.[roleName]);
}

/**
 * Returns whether the conditions for the given role fail for the given role quorum and current bindings.
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @param roleQuorum - A role quorum, in the form of an array containing the minimum number of entities
 *     required for successfully casting the given role.
 * @param roleName - Name of the role we are attempting to cast.
 * @returns Whether the conditions for the given role fail for the given role quorum and current bindings.
 */
async function quorumFailsRoleConditions(
    roleCastingData: RoleCastingData,
    roleQuorum: RoleCandidate[],
    roleName: RoleName,
): Promise<boolean> {
    // If condition testing is suppressed, return `false` now
    if (roleCastingData.suppressConditions) {
        return false;
    }
    // To evaluate conditions, we will place the quorum for this role in the special `__groups__` property
    // of the evaluation context. If the quorum ultimately is not cast in this role, the updates made to the
    // evaluation context here will be undone upstream. Note that we will sort the quorum here to prevent
    // sensitivity to ordering -- we do this because role slots are conceptually unordered in Viv.
    roleCastingData.evaluationContext.__groups__[roleName] = [...roleQuorum].sort(
        (a, b) => (
            getCanonicalRoleCandidatesKey(a).localeCompare(getCanonicalRoleCandidatesKey(b))
        )
    );
    // Test the conditions and return the result (blacklisting may also occur)
    return !(await roleConditionsHold(roleCastingData, roleName, roleQuorum));
}

/**
 * Returns the pool of possible candidates to consider for the given role.
 *
 * Out of precaution, this function always returns a copy of any cached or retrieved pool,
 * and it proactively deduplicates the pool before returning.
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @param roleName - Name of the role we are attempting to cast.
 * @returns The pool of possible candidates to consider for the given role. This is a shuffled, deduplicated copy.
 * @throws {VivInternalError} If a pool directive is required for the role but not present (defensive guard).
 */
async function getCastingPoolForRole(
    roleCastingData: RoleCastingData,
    roleName: RoleName
): Promise<RoleCandidate[]> {
    // Retrieve the role definition
    const roleDefinition = getRoleDefinition(roleCastingData.constructDefinition, roleName);
    // If this role must be precast, there's no pool to retrieve
    if (roleDefinition.precast) {
        return [];
    }
    // If we've already cached a pool for this role, return the cached value
    let pool: RoleCandidate[];
    if (roleCastingData.targetingCache.pools[roleName]) {
        pool = roleCastingData.targetingCache.pools[roleName];
    } else if (roleDefinition.pool) {
        pool = await getCustomPool(roleCastingData, roleDefinition);
    } else if (roleDefinition.entityType === RoleEntityType.Character) {
        pool = await getCharactersPool(roleCastingData, roleDefinition);
    } else if (roleDefinition.entityType === RoleEntityType.Item) {
        pool = await getItemsPool(roleCastingData, roleDefinition);
    } else if (roleDefinition.entityType === RoleEntityType.Location) {
        pool = await GATEWAY.getEntityIDs(EntityType.Location);
    } else {
        throw new VivInternalError("Custom pool required but not present");
    }
    // If we are operating within a search domain and this role casts actions, we need to narrow the
    // pool to only include actions that are present in the search domain. This enforces that sifting
    // over a character's memories cannot match actions they don't know about.
    if (roleDefinition.entityType === RoleEntityType.Action && roleCastingData.evaluationContext.__searchDomain__) {
        const domainSet = new Set(roleCastingData.evaluationContext.__searchDomain__.domain);
        pool = pool.filter(candidate => domainSet.has(candidate as string));
    }
    // Before returning the pool, let's deduplicate it and shuffle it. In the course of
    // deduplicating the pool, we will also end up with a copy.
    pool = deduplicate<RoleCandidate>(pool);  // Creates a copy
    shuffle(pool);
    // Return the pool
    return pool;
}

/**
 * Returns the custom casting pool for the given role, which will have been declared by a Viv author.
 *
 * Note: If the pool expression evaluates to a plain object, the keys of that object will be furnished.
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @param roleDefinition - Definition for the role associated with this casting pool.
 * @returns The custom casting pool for the given role.
 * @throws {VivRoleCastingError} If the evaluated pool is not an array.
 */
async function getCustomPool(
    roleCastingData: RoleCastingData,
    roleDefinition: RoleDefinition
): Promise<RoleCandidate[]> {
    // Attempt to evaluate the Viv expression defining the casting pool
    const castingPoolExpression = (roleDefinition.pool as CastingPool).body;
    let evaluatedPool = await interpretExpression(castingPoolExpression, roleCastingData.evaluationContext);
    // If the evaluated pool is itself the eval fail-safe sentinel, return an empty array now
    if (evaluatedPool === EVAL_FAIL_SAFE_SENTINEL) {
        return [];
    }
    // Dehydrate the pool, since it may be an array of entity-data objects
    evaluatedPool = await dehydrateExpressionValue(evaluatedPool);
    // If at this point the pool is an object, convert it to an array of its keys. This allows Viv authors
    // to write pool directives such as `friend from @person.relationships`, where `@person.relationships`
    // is a map from entity ID to an object containing relationship data.
    if (isPlainObject(evaluatedPool)) {
        evaluatedPool = Object.keys(evaluatedPool);
    } else if (!isArray(evaluatedPool)) {
        // Catch a common Viv authoring error of the form `role-name from @other-role.singular.entity`
        const errorMessage = (
            "Bad pool directive: evaluated to a single value, not an array (likely fix: use 'is' instead of 'from')"
        );
        throw new VivRoleCastingError(
            errorMessage,
            roleCastingData.constructDefinition,
            roleDefinition.name,
            { castingPoolExpression, evaluatedPool }
        );
    }
    // Handle any instances of the eval fail-safe sentinel
    evaluatedPool = evaluatedPool.filter(candidate => candidate !== EVAL_FAIL_SAFE_SENTINEL);
    // Validate the pool
    assertValidCastingPoolForRole(roleCastingData.constructDefinition, roleDefinition, evaluatedPool);
    // If this casting pool is cachable, cache it now. This occurs so long as a role does not have a pool
    // declaration that references a non-initiator role (in which case the role pool would have to be
    // re-computed if the parent role(s) were to be re-cast).
    if (!roleDefinition.pool?.uncachable) {
        roleCastingData.targetingCache.pools[roleDefinition.name] =
            [...(evaluatedPool as RoleCandidate[])];
    }
    // If we get to here, validation succeeded, so we can return the pool now. At this point, the pool may
    // contain strange values -- i.e., ones that aren't entity IDs or viable symbol-role bindings -- but
    // it's not worth validating these at runtime, so we'll just assume good types at compile time.
    return evaluatedPool;
}

/**
 * Validates the given casting pool and, if valid, narrows the pool type.
 *
 * @param constructDefinition - The definition for the construct at hand.
 * @param roleDefinition - Definition for the role we are attempting to cast.
 * @param pool - The evaluated casting pool to validate.
 * @returns Nothing. Only returns if the pool passes validation.
 * @throws {VivRoleCastingError} If the pool is not an array.
 * @throws {VivRoleCastingError} If the pool contains a nullish value.
 * @throws {VivRoleCastingError} If the pool contains an invalid type for a symbol role.
 * @throws {VivRoleCastingError} If the pool contains a non-string value for an entity role.
 */
function assertValidCastingPoolForRole(
    constructDefinition: ConstructDefinition,
    roleDefinition: RoleDefinition,
    pool: unknown
): asserts pool is RoleCandidate[] {
    if (!Array.isArray(pool)) {
        throw new VivRoleCastingError(
            "Bad pool directive: evaluated pool is not an array",
            constructDefinition,
            roleDefinition.name,
            { poolDirective: roleDefinition.pool, evaluatedPool: pool }
        );
    }
    for (const candidate of pool) {
        if (candidate === null) {
            throw new VivRoleCastingError(
                "Bad pool directive: evaluated pool contains null value",
                constructDefinition,
                roleDefinition.name,
                { poolDirective: roleDefinition.pool, evaluatedPool: pool }
            );
        } else if (candidate === undefined) {
            throw new VivRoleCastingError(
                "Bad pool directive: evaluated pool contains undefined value",
                constructDefinition,
                roleDefinition.name,
                { poolDirective: roleDefinition.pool, evaluatedPool: pool }
            );
        }
        if (roleDefinition.entityType === RoleEntityType.Symbol) {
            if (!isSymbolRoleBinding(candidate)) {
                throw new VivRoleCastingError(
                    "Bad pool directive: evaluated pool for symbol role contains invalid type",
                    constructDefinition,
                    roleDefinition.name,
                    { poolDirective: roleDefinition.pool, evaluatedPool: pool }
                );
            }
        } else if (!isString(candidate)) {
            // Technically, the pool should contain only entity IDs -- but it's expensive to confirm
            // that a string is an entity ID, since that requires an adapter call. Right now, we'll
            // confirm that the pool contains only strings, and only if we consider a given candidate,
            // later on, will we confirm that it's indeed an entity ID.
            throw new VivRoleCastingError(
                "Bad pool directive: evaluated pool for entity role contains non-string (must be entity ID)",
                constructDefinition,
                roleDefinition.name,
                { poolDirective: roleDefinition.pool, evaluatedPool: pool, candidate }
            );
        }
    }
}

/**
 * Returns an array containing entity IDs that can serve as candidates for the given item role.
 *
 * If we are targeting an action or a selector: we will limit to nearby items assuming the role
 * isn't tagged `anywhere`, and if a pool of nearby items has not been computed yet for the given
 * initiator, the value will be cached.
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @param roleDefinition - Definition for the role associated with this casting pool.
 * @returns An array containing entity IDs that can serve as candidates for the given item role.
 */
async function getItemsPool(
    roleCastingData: RoleCastingData,
    roleDefinition: RoleDefinition
): Promise<UID[]> {
    if (isActionOrSelectorRoleCastingData(roleCastingData)) {
        if (!roleDefinition.anywhere) {
            if (roleCastingData.initiatorLevelCache.nearbyItemIDs === null) {
                roleCastingData.initiatorLevelCache.nearbyItemIDs = await GATEWAY.getEntityIDs(
                    EntityType.Item,
                    roleCastingData.initiatorLevelCache.initiatorData.location
                );
            }
            return roleCastingData.initiatorLevelCache.nearbyItemIDs;
        }
    }
    return await GATEWAY.getEntityIDs(EntityType.Item);
}

/**
 * Returns an array containing entity IDs that can serve as candidates for the given character role.
 *
 * If we are targeting an action or a selector: we will limit to nearby characters assuming the role
 * isn't tagged `anywhere`, and if a pool of nearby characters has not been computed yet for the
 * given initiator, the value will be cached.
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @param roleDefinition - Definition for the role associated with this casting pool.
 * @returns An array containing entity IDs that can serve as candidates for the given character role.
 */
async function getCharactersPool(
    roleCastingData: RoleCastingData,
    roleDefinition: RoleDefinition
): Promise<UID[]> {
    if (isActionOrSelectorRoleCastingData(roleCastingData)) {
        if (!roleDefinition.anywhere) {
            if (roleCastingData.initiatorLevelCache.nearbyCharacterIDs === null) {
                roleCastingData.initiatorLevelCache.nearbyCharacterIDs =
                    await GATEWAY.getEntityIDs(
                        EntityType.Character,
                        roleCastingData.initiatorLevelCache.initiatorData.location
                    );
            }
            return roleCastingData.initiatorLevelCache.nearbyCharacterIDs;
        }
    }
    return await GATEWAY.getEntityIDs(EntityType.Character);
}

/**
 * Attempts to cast the given entity in the given role, returning updated bindings if this succeeds, else `null`.
 *
 * Note that casting may require recursive casting of downstream roles. Here, 'downstream' roles are
 * descendants of this one in the role dependency tree that structures role casting.
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @param candidate - For a symbol role, the candidate symbol literal, else the entity ID for the entity
 *     currently under consideration for the given role.
 * @param roleName - Name of the role being cast here.
 * @param fillingOptionalSlot - Whether we are attempting to cast an optional role slot.
 * @returns Updated bindings, if casting succeeds, else `null`.
 */
async function attemptToCastRoleCandidate(
    roleCastingData: RoleCastingData,
    candidate: RoleCandidate,
    roleName: RoleName,
    fillingOptionalSlot: boolean
): Promise<RoleBindings | null> {
    // Before we get started, let's take a snapshot of the dynamic role-casting data that will be
    // mutated as we attempt to cast this role candidate. If anything goes wrong, either with the
    // candidate or something downstream, we'll backtrack to here and restore the snapshot data.
    const dynamicRoleCastingDataSnapshot: DynamicRoleCastingData = {
        currentBindings: clone<RoleBindings>(roleCastingData.currentBindings),
        evaluationContext: clone<EvaluationContext>(roleCastingData.evaluationContext)
    };
    // Determine whether the given candidate can be cast in the given role, modulo any downstream concerns
    const candidateCanPlayRole = await candidateFitsRole(roleCastingData, candidate, roleName);
    // If not, due to a failed condition or embargo or another immediate reason, let's return null once
    // we've undone our changes to the bindings and evaluation context.
    if (!candidateCanPlayRole) {
        backtrack(roleCastingData, dynamicRoleCastingDataSnapshot);
        return null;
    }
    // The candidate passed those tests, so let's add them into the bindings. If we are casting
    // an optional slot, they've been fully vetted, and we can return the updated bindings.
    if (!roleCastingData.currentBindings[roleName]) {
        roleCastingData.currentBindings[roleName] = [];
    }
    roleCastingData.currentBindings[roleName].push(candidate);
    if (fillingOptionalSlot) {
        return roleCastingData.currentBindings;
    }
    // Otherwise, we'll now consider the candidate *temporarily* bound as we attempt to cast
    // any downstream roles. If issues arise downstream, we'll backtrack to here and remove
    // the candidate from the bindings before returning `null`.
    const updatedBindings = await castDownstreamRoles(roleCastingData, roleName);
    // If we receive `null` here, this entity cannot be cast in this role due to downstream
    // issues, in which case we must return `null` now. First, however, we'll undo our changes
    // to the bindings and evaluation context.
    if (updatedBindings === null) {
        await recordBacktrackingReason(
            roleCastingData.constructDefinition,
            roleName,
            RoleCastingBacktrackReason.DownstreamFailure
        );
        backtrack(roleCastingData, dynamicRoleCastingDataSnapshot);
        return null;
    }
    // If we didn't receive `null`, there were no downstream issues, so let's return the updated bindings
    return updatedBindings;
}

/**
 * Returns whether the given candidate can be cast in the given role (modulo potential downstream issues).
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @param candidate - For a symbol role, the candidate symbol literal, else the entity ID for the entity
 *     currently under consideration for the given role.
 * @param roleName - Name of the role under consideration.
 * @param ignoreConditions - Whether to forego condition testing. This parameter allows the caller to test
 *     whether the given candidate meets the basic role criteria, which can be done independently for the
 *     individual members of a role quorum or of precast bindings. Any time we can prune an entity in this
 *     manner before testing conditions in a combinatorial space like possible quorums, it's a win.
 * @returns Whether the given candidate can be cast in the given role.
 */
async function candidateFitsRole(
    roleCastingData: RoleCastingData,
    candidate: RoleCandidate,
    roleName: RoleName,
    ignoreConditions = false
): Promise<boolean> {
    // If this candidate is blacklisted from this role, return false immediately
    if (candidateIsBlacklistedFromRole(roleCastingData, candidate, roleName)) {
        await recordBacktrackingReason(
            roleCastingData.constructDefinition,
            roleName,
            RoleCastingBacktrackReason.BlacklistedCandidate
        );
        return false;
    }
    // If the given candidate is already bound to another role, return `false` (and potentially blacklist)
    if (candidateIsBoundToOtherRole(roleCastingData, candidate, roleName)) {
        await recordBacktrackingReason(
            roleCastingData.constructDefinition,
            roleName,
            RoleCastingBacktrackReason.CandidateAlreadyCast
        );
        return false;
    }
    // If an entity in this role must be co-located with the initiator, and if this
    // is not the case for this candidate, return `false` and blacklist.
    if (await candidateIsNotPresentForPresentRole(roleCastingData, candidate, roleName)) {
        await recordBacktrackingReason(
            roleCastingData.constructDefinition,
            roleName,
            RoleCastingBacktrackReason.CandidateNotPresent
        );
        return false;
    }
    // If casting the candidate in this role violates an embargo on an action being
    // targeted, return `false` now (and potentially blacklist as well).
    if (await candidateInRoleWouldViolateEmbargo(roleCastingData, candidate, roleName)) {
        await recordBacktrackingReason(
            roleCastingData.constructDefinition,
            roleName,
            RoleCastingBacktrackReason.CandidateViolatesEmbargo
        );
        return false;
    }
    // Now it's time to test the conditions for this role. If they do not hold given this candidate
    // and the existing bindings, we'll return `false` (and potentially blacklist as well).
    if (!ignoreConditions) {
        if (await candidateFailsRoleConditions(roleCastingData, candidate, roleName)) {
            await recordBacktrackingReason(
                roleCastingData.constructDefinition,
                roleName,
                RoleCastingBacktrackReason.CandidateFailedConditions
            );
            return false;
        }
    }
    // If we get to here, this candidate has passed all our tests, and is thus fit to be cast in this role
    return true;
}

/**
 * Returns whether the given candidate is currently blacklisted from being cast in the given role.
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @param candidate - For a symbol role, the candidate symbol literal, else the entity ID for the entity
 *     currently under consideration for the given role. Note that symbol values cannot be blacklisted.
 * @param roleName - Name of the role we are attempting to cast.
 * @returns Whether the given candidate is currently blacklisted from the given role.
 */
function candidateIsBlacklistedFromRole(
    roleCastingData: RoleCastingData,
    candidate: RoleCandidate,
    roleName: RoleName
): boolean {
    const blacklistKey = getCanonicalRoleCandidatesKey(candidate);
    return Boolean(roleCastingData.targetingCache.blacklists[blacklistKey]?.[roleName]);
}

/**
 * Returns whether the given candidate is already bound to another role.
 *
 * If the given candidate is precast in another role, blacklisting also occurs. Blacklisting will
 * also occur if the given candidate is the initiator and the given role is not the initiator role.
 *
 * One exception here: the `actions` field of a sifting pattern, which otherwise works just like
 * the `roles` field, is exempt from this constraint. This is because sifting patterns may run
 * other sifting patterns, with the matched actions all being cast into the higher-order one,
 * and this often leads to (unproblematic) overlap. Moreover, an author may cast an action in
 * the pattern `roles` field, and then precast that action in the sub-patterns -- this is the
 * idiomatic way of enforcing correspondence between the actions of multiple sub-patterns.
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @param candidate - For a symbol role, the candidate symbol literal, else the entity ID for the entity
 *     currently under consideration for the given role.
 * @param roleName - Name of the role we are attempting to cast.
 * @returns Whether the given candidate is already bound to another role.
 */
function candidateIsBoundToOtherRole(
    roleCastingData: RoleCastingData,
    candidate: RoleCandidate,
    roleName: RoleName,
): boolean {
    // If this is a role in the `actions` field of a sifting pattern, return `false` now (see note above)
    if (isSiftingPatternActionRole(roleName, roleCastingData.constructDefinition)) {
        return false;
    }
    // If the given candidate has been precast for another role, return `true` after
    // blacklisting them for the role at hand.
    for (const precastRoleName in roleCastingData.precastBindings) {
        if (precastRoleName === roleName) {
            continue;  // Of course, it's fine if they were precast for the role at hand
        }
        const precastCandidates = roleCastingData.precastBindings[precastRoleName];
        for (const precastCandidate of precastCandidates) {
            if (precastCandidate === candidate) {
                blacklist(roleCastingData, candidate, roleName);
                return true;
            }
        }
    }
    // Otherwise, if the candidate is already bound to another role, return `true` now after
    // blacklisting the initiator for any non-initiator role, as applicable (see note below).
    const alreadyBoundEntities = Object.values(roleCastingData.currentBindings).flat();
    if (alreadyBoundEntities.includes(candidate)) {
        if (isActionOrSelectorRoleCastingData(roleCastingData)) {
            // If the given candidate is the initiator and if the given role is not the initiator role,
            // let's go ahead and blacklist them, since the initiator can never play another role as
            // well. This will lead to a quicker check next time.
            if (candidate === roleCastingData.initiatorLevelCache.initiatorData.id) {
                if (roleName !== roleCastingData.constructDefinition.initiator) {
                    blacklist(roleCastingData, roleCastingData.initiatorLevelCache.initiatorData.id, roleName);
                }
            }
        }
        return true;
    }
    // If we get to here, the candidate is not currently bound in another role
    return false;
}

/**
 * Returns whether we have a case of a non-present candidate being considered for a role requiring a present entity.
 *
 * Note that this check is only conducted when we're targeting an action or a selector. In all other
 * cases, `false` is returned immediately.
 *
 * This function will also blacklist the candidate, should they not be present for a present role.
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @param candidate - For a symbol role, the candidate symbol literal, else the entity ID for the entity
 *     currently under consideration for the given role.
 * @param roleName - Name of the role we are attempting to cast.
 * @returns Whether we have a case of a non-present candidate being considered for a role requiring a present entity.
 * @throws {VivRoleCastingError} If the given role is a non-symbol role but the given candidate is not an entity.
 */
async function candidateIsNotPresentForPresentRole(
    roleCastingData: RoleCastingData,
    candidate: RoleCandidate,
    roleName: RoleName,
): Promise<boolean> {
    // If we are not targeting an action or a selector, there is no notion of physically
    // present roles, so we can simply return `false` now.
    if (!isActionOrSelectorRoleCastingData(roleCastingData)) {
        return false;
    }
    // Otherwise, let's conduct the check
    const roleDefinition = getRoleDefinition(roleCastingData.constructDefinition, roleName);
    if (roleDefinition.participationMode === RoleParticipationMode.Initiator) {
        // The initiator is by definition always present for their own action
        return false;
    }
    if (actionRoleRequiresPresence(roleDefinition)) {
        const actionLocationID = roleCastingData.initiatorLevelCache.initiatorData.location;
        if (!isString(candidate) || !(await GATEWAY.isEntityID(candidate))) {
            let errorSource = "casting pool";
            if ((roleCastingData.precastBindings[roleName] ?? []).includes(candidate)) {
                errorSource = "precast bindings";
            }
            throw new VivRoleCastingError(
                `Bad ${errorSource}: non-entity candidate in entity role`,
                roleCastingData.constructDefinition,
                roleDefinition.name,
                { candidate }
            );
        }
        const candidateLocationID = await GATEWAY.getEntityLocation(candidate);
        if (candidateLocationID !== actionLocationID) {
            // We can also blacklist the candidate, since the location properties in
            // question cannot change during the lifespan of a blacklist.
            blacklist(roleCastingData, candidate, roleDefinition.name);
            return true;
        }
    }
    return false;
}

/**
 * Returns whether the given action role can only cast an entity who is present for the action.
 *
 * Note: The function assumes that the caller has already ensured that this is an action role,
 * since presence does not apply for the other construct types.
 *
 * @param roleDefinition - Definition for the role in question.
 * @returns Whether the given action role can only cast an entity who is present for the action.
 */
export function actionRoleRequiresPresence(roleDefinition: RoleDefinition): boolean {
    if (roleDefinition.participationMode === RoleParticipationMode.Initiator) {
        // Initiator is always present, natch
        return true;
    }
    if (roleDefinition.anywhere) {
        return false;
    }
    return roleDefinition.entityType === RoleEntityType.Character || roleDefinition.entityType === RoleEntityType.Item;
}

/**
 * Returns whether casting the given candidate in the given role would violate an active action embargo.
 *
 * Note that this check is only conducted when we're targeting an action or a selector. In all other cases,
 * `false` is returned immediately.
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @param candidate - For a symbol role, the candidate symbol literal, else the entity ID for the entity
 *     currently under consideration for the given role.
 * @param roleName - Name of the role we are attempting to cast.
 * @returns Whether casting the given candidate in the given role (with the given other
 *     bindings) would violate an active embargo.
 */
async function candidateInRoleWouldViolateEmbargo(
    roleCastingData: RoleCastingData,
    candidate: RoleCandidate,
    roleName: RoleName,
): Promise<boolean> {
    // If we are not targeting an action or a selector, there is no embargo notion at play, so return `false` now
    if (!isActionOrSelectorRoleCastingData(roleCastingData)) {
        return false;
    }
    // Determine whether casting the candidate in this role would violate an active embargo
    const prospectiveBindings: RoleBindings = {
        ...roleCastingData.currentBindings,
        [roleName]: (roleCastingData.currentBindings[roleName] ?? []).concat([candidate]),
    };
    const activeEmbargo = await getViolatedEmbargo(
        roleCastingData.constructDefinition.name,
        prospectiveBindings,
        roleCastingData.initiatorLevelCache.initiatorData.location,
        roleCastingData.initiatorLevelCache
    );
    // If it would, we'll return `true` after considering potential blacklisting. If the active embargo holds
    // for at most this role and the initiator role, we will blacklist this candidate from being cast in this
    // role, since the initiator will never change during the embargo lifespan.
    if (activeEmbargo) {
        let blacklistable = !!activeEmbargo.bindings;
        if (blacklistable) {
            for (const embargoRoleName in activeEmbargo.bindings) {
                if (embargoRoleName !== roleName && embargoRoleName !== roleCastingData.constructDefinition.initiator) {
                    blacklistable = false;
                    break;
                }
            }
        }
        if (blacklistable) {
            blacklist(roleCastingData, candidate, roleName);
        }
        return true;
    }
    // If we get to here, casting the candidate in this role would not violate an
    // active embargo, so we can safely return `false` now.
    return false;
}

/**
 * Returns whether the conditions for the given role fail for the given candidate and current bindings.
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @param candidate - For a symbol role, the candidate symbol literal, else the entity ID for the entity
 *     currently under consideration for the given role.
 * @param roleName - Name of the role we are attempting to cast.
 * @returns Whether the conditions for the given role failed for the given candidate and current bindings.
 * @throws {VivInternalError} If the evaluation context is malformed (defensive guard).
 */
async function candidateFailsRoleConditions(
    roleCastingData: RoleCastingData,
    candidate: RoleCandidate,
    roleName: RoleName,
): Promise<boolean> {
    // Retrieve the role definition
    const roleDefinition = getRoleDefinition(roleCastingData.constructDefinition, roleName);
    // To evaluate conditions, we need to first add the candidate into the evaluation context. If the
    // candidate cannot be cast into this role, an upstream process will take care of undoing this update.
    if (roleDefinition.max === 1) {  // Note: Optional singleton roles (min=0, max=1) do not go in `__groups__`
        roleCastingData.evaluationContext[roleName] = candidate;
    } else {
        const group = roleCastingData.evaluationContext.__groups__[roleName];
        if (!isArrayOf<RoleCandidate>(group, isRoleCandidate)) {
            throw new VivInternalError("Evaluation context is missing __groups__ entry for group role");
        }
        group.push(candidate);
        group.sort(
            (a, b) => (
                getCanonicalRoleCandidatesKey(a).localeCompare(getCanonicalRoleCandidatesKey(b))
            )
        );
    }
    // Test the conditions and return the result (blacklisting may also occur)
    return !(await roleConditionsHold(roleCastingData, roleName, candidate));
}

/**
 * Returns whether the conditions hold for the given role and given evaluation context.
 *
 * If applicable, blacklisting will occur for this role, using the given blacklist key.
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @param roleName - Name of the role we are attempting to cast.
 * @param candidateOrQuorum - The candidate or role quorum whom we will potentially blacklist
 *     for the given role, should the conditions fail.
 * @returns Whether the conditions hold for the given role and given evaluation context.
 */
async function roleConditionsHold(
    roleCastingData: RoleCastingData,
    roleName: RoleName,
    candidateOrQuorum: RoleCandidate | RoleCandidate[]
): Promise<boolean> {
    // If condition testing is suppressed, return `true` now
    if (roleCastingData.suppressConditions) {
        return true;
    }
    // Otherwise, test each condition in turn
    for (const condition of roleCastingData.constructDefinition.conditions.roleConditions[roleName]) {
        const evaluation = await interpretExpression(
            condition.body,
            roleCastingData.evaluationContext,
            true
        );
        if (!isTruthy(evaluation)) {
            await recordConditionTestResult(roleCastingData.constructDefinition, condition.body, false);
            if (isActionOrSelectorRoleCastingData(roleCastingData)) {
                // If the failed condition references no other non-initiator role, we can safely blacklist from
                // this role the candidate/quorum captured by the given blacklist key, since it is thus incompatible
                // given the initiator. Note that the condition may represent something other than an inherent
                // incompatibility -- for instance, it could be a bare `chance` expression (e.g., 35%) that failed.
                // But even so, we still want to blacklist this candidate/quorum, because otherwise we will sample
                // the stochastic value again, potentially leading to something like a 35% + 35% + 35% chance for
                // this candidate/quorum, simply because issues with other roles allowed for retesting with the
                // same candidate/quorum.
                let blacklistable = true;
                for (const conditionRoleName of condition.references) {
                    if (conditionRoleName !== roleName) {
                        if (conditionRoleName !== roleCastingData.constructDefinition.initiator) {
                            blacklistable = false;
                            break;
                        }
                    }
                }
                if (blacklistable) {
                    blacklist(roleCastingData, candidateOrQuorum, roleName);
                }
            }
            return false;
        } else {
            await recordConditionTestResult(roleCastingData.constructDefinition, condition.body, true);
        }
    }
    // If we get to here, none of the conditions failed, so we can safely return `true`
    return true;
}

/**
 * Blacklists the given candidate or role quorum from being cast in the given role (while the cache persists).
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @param candidateOrQuorum - The candidate or role quorum whom we will blacklist for the given role.
 * @param roleName - The role for which the given candidate or role quorum whom we will be blacklisted.
 * @returns Nothing.
 */
function blacklist(
    roleCastingData: RoleCastingData,
    candidateOrQuorum: RoleCandidate | RoleCandidate[],
    roleName: RoleName
): void {
    const blacklistKey = getCanonicalRoleCandidatesKey(candidateOrQuorum);
    if (!roleCastingData.targetingCache.blacklists[blacklistKey]) {
        roleCastingData.targetingCache.blacklists[blacklistKey] = {};
    }
    roleCastingData.targetingCache.blacklists[blacklistKey][roleName] = true;
}

/**
 * Backtracks from the given role candidate, which has just failed casting, by removing
 * them from the given bindings and evaluation context (via in-place mutation).
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @param dynamicRoleCastingDataSnapshot - A snapshot containing previous values for the dynamic fields of the targeting
 *     data, which we will now restore due to backtracking.
 * @returns Nothing. The role-casting data is restored by mutating its bindings and evaluation context in place.
 */
function backtrack(
    roleCastingData: RoleCastingData,
    dynamicRoleCastingDataSnapshot: DynamicRoleCastingData
): void {
    roleCastingData.currentBindings = dynamicRoleCastingDataSnapshot.currentBindings;
    roleCastingData.evaluationContext = dynamicRoleCastingDataSnapshot.evaluationContext;
}

/**
 * Attempts to recursively cast roles that are *downstream* from the given one.
 *
 * Here, 'downstream' roles are descendants in the role-dependency tree that structures role casting.
 *
 * @param roleCastingData - An object containing various data associated with the current targeting instance.
 * @param roleName - Name of the role we are attempting to cast.
 * @returns Updated bindings, if all downstream casting succeeds, else `null`.
 */
async function castDownstreamRoles(
    roleCastingData: RoleCastingData,
    roleName: RoleName,
): Promise<RoleBindings | null> {
    const roleDefinition = getRoleDefinition(roleCastingData.constructDefinition, roleName);
    for (const childRoleName of roleDefinition.children) {
        const updatedBindings = await castRole(roleCastingData, childRoleName);
        // If a bindings of `null` reaches us here, we need to stop now and pass
        // this `null` value back, to trigger backtracking upstream.
        if (updatedBindings === null) {
            return null;
        }
        roleCastingData.currentBindings = updatedBindings;
    }
    return roleCastingData.currentBindings;
}
