import type { ActionSelectorDefinition, ConstructDefinition, PlanSelectorDefinition } from "../content-bundle/types";
import type { ActionTargetingEventImpetus } from "../debugger";
import type { EvaluationContext } from "../interpreter/types";
import type { InitiatorLevelCache, RoleBindings, RoleCastingResult } from "../role-caster/types";
import type { SelectorCandidate, SelectorResult, SelectorResultFailure } from "./types";
import { targetAction } from "../action-manager";
import { ConstructDiscriminator } from "../content-bundle";
import { VivExecutionError, VivInternalError } from "../errors";
import { interpretExpression } from "../interpreter";
import { castRoles, precastRoles } from "../role-caster";
import {
    clone,
    getActionDefinition,
    getActionSelectorDefinition,
    getPlanDefinition,
    getPlanSelectorDefinition,
    isNumber,
    shuffle,
    weightedShuffle
} from "../utils";
import { SelectorPolicy } from "./constants";


/**
 * Targets the given action selector or plan selector, returning a result upon successful targeting
 * of any candidate or unsuccessful targeting of all candidates.
 *
 * A selector specifies candidates to target in an order that is derived according to the selector's sort
 * policy. The candidates may be actions/plans or other selectors, and targeting for the selector succeeds
 * upon the successful targeting of any given candidate. As such, successful targeting will always result
 * in an action being performed or a plan being launched, even as a selector may target other selectors.
 *
 * Note that the compiler ensures that there are no cycles among the selectors defined in a content bundle.
 *
 * @param selectorDefinition - Definition for the action selector or plan selector to target.
 * @param precastBindings - Partial or complete bindings for the selector.
 * @param initiatorLevelCache - If this is an action selector, an initiator-level cache.
 * @param actionTargetingEventSource - If this is an action selector, how the action entered the targeting pipeline.
 * @returns An object containing the name of an action or plan successfully targeted via the selector, if any,
 *     as well as role-casting data associated with the targeting. See {@link SelectorResult} for more details.
 */
export async function targetSelector(
    selectorDefinition: ActionSelectorDefinition | PlanSelectorDefinition,
    precastBindings: RoleBindings,
    initiatorLevelCache?: InitiatorLevelCache,
    actionTargetingEventSource?: ActionTargetingEventImpetus,
): Promise<SelectorResult> {
    // Attempt to cast the selector's own roles
    const selectorRoleCastingResult = await castRoles(
        selectorDefinition,
        precastBindings,
        null,
        initiatorLevelCache
    );
    // If the `bindings` property in the result is `null`, we could not cast the roles
    // for the selector itself, so we can't proceed onto targeting of its candidates.
    if (!selectorRoleCastingResult.bindings) {
        const result: SelectorResultFailure = { selectedConstructName: null };
        return result;
    }
    // If we get to here, it's time to target the candidates. First, we need to sort them using the
    // selector's specified policy. If the policy is weighted-random, we will need to evaluate the
    // expressions by which the candidate weights may be derived, and this requires the evaluation
    // context that was just produced as a result of role casting for the selector itself.
    const candidates = await sortSelectorCandidates(selectorDefinition, selectorRoleCastingResult.evaluationContext);
    // Now let's try targeting them in turn. If targeting succeeds, we'll stop immediately and return the result.
    for (const candidate of candidates) {
        const selectorResult = await targetSelectorCandidate(
            selectorDefinition,
            candidate,
            selectorRoleCastingResult.evaluationContext,
            initiatorLevelCache,
            actionTargetingEventSource
        );
        if (selectorResult.selectedConstructName) {
            return selectorResult;
        }
    }
    // If we get to here, targeting failed for all candidates, so we need to return a negative result
    const result: SelectorResultFailure = { selectedConstructName: null };
    return result;
}

/**
 * Returns an array containing the given selector's candidates, sorted according to its sort policy.
 *
 * Note that this function works for both action selectors and plan selectors.
 *
 * @param selectorDefinition - Definition for the selector whose candidates will be sorted.
 * @param evaluationContext - The evaluation context produced during role casting for the selector itself,
 *     which may be needed to evaluate the expressions that derive candidate weights (as applicable).
 * @returns An array containing the given selector's candidates, sorted according to its sort policy.
 * @throws {VivInternalError} If the selector has an unexpected sort policy.
 * @throws {VivInternalError} If the selector uses the weighted-random policy but not all candidates have weights.
 * @throws {VivExecutionError} If a candidate weight does not evaluate to a positive number.
 */
async function sortSelectorCandidates(
    selectorDefinition: ActionSelectorDefinition | PlanSelectorDefinition,
    evaluationContext: EvaluationContext
): Promise<SelectorCandidate[]> {
    const candidates = clone<SelectorCandidate[]>(selectorDefinition.candidates);
    switch (selectorDefinition.policy) {
        case SelectorPolicy.Ordered:
            return candidates;
        case SelectorPolicy.Randomized:
            shuffle(candidates);
            return candidates;
        case SelectorPolicy.Weighted:
            const weights: number[] = [];
            for (const candidate of candidates) {
                // The compiler enforces that all candidates have weights in a weighted-random selector,
                // but TypeScript doesn't know that.
                if (candidate.weight === null) {
                    throw new VivInternalError("Candidate in weighted-random selector is missing a weight");
                }
                const weight = await interpretExpression(candidate.weight, evaluationContext);
                if (!isNumber(weight) || weight < 0) {
                    const errorMessage = (
                        `Weight in selector '${selectorDefinition.name}' for candidate '${candidate.name}' `
                        + "did not evaluate to a positive number"
                    );
                    throw new VivExecutionError(errorMessage, { candidate, evaluatedWeight: weight });
                }
                weights.push(weight);
            }
            return weightedShuffle<SelectorCandidate>(candidates, weights);
        default:
            throw new VivInternalError(`Unexpected sort policy: '${(selectorDefinition as any).policy}'`);
    }
}

/**
 * Targets the given selector candidate, returning the associated role-casting data.
 *
 * Note that the compiler ensures that there are no cycles among the selectors defined in a content bundle.
 *
 * @param selectorDefinition - Definition for the action selector or plan selector to target.
 * @param candidate - The selector candidate to target (may be another selector).
 * @param evaluationContext - The enclosing evaluation context to use when targeting the candidate.
 * @param initiatorLevelCache - If the candidate is an action or action selector, an initiator-level cache.
 * @param actionTargetingEventSource - If the candidate is an action, how it entered the targeting pipeline.
 * @returns An object containing the name of an action or plan successfully targeted via the candidate, if any,
 *     as well as role-casting data associated with the targeting. See {@link SelectorResult} for more details.
 * @throws {VivInternalError} If the candidate is an action selector and the `initiatorLevelCache` argument
 *     is missing (defensive guard).
 */
async function targetSelectorCandidate(
    selectorDefinition: ActionSelectorDefinition | PlanSelectorDefinition,
    candidate: SelectorCandidate,
    evaluationContext: EvaluationContext,
    initiatorLevelCache?: InitiatorLevelCache,
    actionTargetingEventSource?: ActionTargetingEventImpetus,
): Promise<SelectorResult> {
    // If the candidate is a selector, handle it accordingly
    if (candidate.isSelector) {
        let candidateDefinition: ConstructDefinition;
        if (selectorDefinition.type === ConstructDiscriminator.ActionSelector) {
            candidateDefinition = getActionSelectorDefinition(candidate.name);
        } else {
            candidateDefinition = getPlanSelectorDefinition(candidate.name);
        }
        const candidatePrecastBindings = await precastRoles(
            candidateDefinition,
            candidate.bindings,
            evaluationContext
        );
        return await targetSelector(
            candidateDefinition,
            candidatePrecastBindings,
            initiatorLevelCache,
            actionTargetingEventSource
        );
    }
    // Otherwise, it's an action or a plan, so the question is simply whether we can target it successfully
    let candidateRoleCastingResult: RoleCastingResult;
    if (selectorDefinition.type === ConstructDiscriminator.ActionSelector) {
        if (!initiatorLevelCache) {
            throw new VivInternalError("Cannot run action selector without initiator data");
        }
        const candidateDefinition = getActionDefinition(candidate.name);
        const candidatePrecastBindings = await precastRoles(
            candidateDefinition,
            candidate.bindings,
            evaluationContext
        );
        candidateRoleCastingResult = await targetAction(
            candidateDefinition,
            candidatePrecastBindings,
            initiatorLevelCache,
            actionTargetingEventSource
        );

    } else {
        const candidateDefinition = getPlanDefinition(candidate.name);
        const candidatePrecastBindings = await precastRoles(
            candidateDefinition,
            candidate.bindings,
            evaluationContext
        );
        candidateRoleCastingResult = await castRoles(candidateDefinition, candidatePrecastBindings, null);
    }
    let result: SelectorResult;
    if (candidateRoleCastingResult.bindings) {
        result = {
            selectedConstructName: candidate.name,
            roleCastingResult: candidateRoleCastingResult
        };
    } else {
        result = { selectedConstructName: null };
    }
    return result;
}
