import type { ActionView, DiegeticTimestamp, UID } from "../adapter/types";
import type { QueryDefinition, QueryNumericRange } from "../content-bundle/types";
import type { SearchDomainDeclaration, TemporalConstraint } from "../dsl/types";
import type { EvaluationContext } from "../interpreter/types";
import type { CharacterMemory } from "../knowledge-manager/types";
import type { RoleBindings } from "../role-caster/types";
import { TemporalStatementDiscriminator } from "../dsl";
import { VivExecutionError, VivInternalError } from "../errors";
import { GATEWAY } from "../gateway";
import { interpretExpression } from "../interpreter";
import { castRoles } from "../role-caster";
import { getActionView, groundRelativePointInTime, isNumber, timeOfDayIsAtOrAfter } from "../utils";
import { prepareSearchDomain, setPredicateHolds } from "./utils";

/**
 * Runs the given search query, over its specified domain, and returns entity IDs for all matching actions.
 *
 * If the query specifies a character as the domain, the search will be conducted over that character's memories,
 * and otherwise over the chronicle. If any `salience` and/or `associations` criteria are present in the query, a
 * character must be provided for the search domain, otherwise an error will be thrown.
 *
 * @param queryDefinition - Definition for the search query to run, if any. If `null` is provided,
 *     all actions in the specified search domain will match.
 * @param precastBindings - Precast bindings for the search query, if there is one, else an empty object.
 * @param searchDomainDeclaration - A specification for how to construct a search domain.
 * @param enclosingEvaluationContext - The Viv evaluation context for the closure containing the action search,
 *     which must be loaded with precast bindings to facilitate evaluating the search-domain expression.
 * @param limit - The maximum number of query matches to return. This should be greater than or equal to one.
 * @returns An array containing IDs for all actions that match the query.
 * @throws {VivExecutionError} If the given query specifies `salience` and/or `associations` criteria,
 *     but the prepared search domain is not a character's memories.
 */
export async function runActionSearch(
    queryDefinition: QueryDefinition | null,
    precastBindings: RoleBindings,
    searchDomainDeclaration: SearchDomainDeclaration,
    enclosingEvaluationContext: EvaluationContext,
    limit?: number
): Promise<UID[]> {
    // First, prepare the search domain, which will be structured as an array of entity IDs for actions
    const searchDomain = await prepareSearchDomain(searchDomainDeclaration, enclosingEvaluationContext);
    // If the query has salience and/or associations criteria, ensure that a search domain was specified
    if ((queryDefinition?.salience || queryDefinition?.associations) && !searchDomain.memoryLayer) {
        throw new VivExecutionError(
            `Cannot run search query '${queryDefinition.name}': query has 'salience' and/or `
            + `'associations' fields, but search domain is the chronicle (must be a character's memories)`,
            { searchDomainDeclaration }
        );
    }
    // If there is no query to run, simply return the domain. There will be no target query
    // in the case of an open search over a given domain, e.g., a character's memories.
    if (!queryDefinition) {
        return searchDomain.domain;
    }
    // Otherwise, attempt role casting for the query
    const roleCastingResult = await castRoles(queryDefinition, precastBindings, searchDomain);
    // If role casting failed, the action search failed, so we can return an empty array now
    if (!roleCastingResult.bindings) {
        return [];
    }
    // Otherwise, let's run the query against our search domain, using the evaluation
    // context created as a byproduct of role casting. We'll collect matches as we go.
    const currentTimestamp = queryDefinition.time ? await GATEWAY.getCurrentTimestamp() : null;
    const matches: UID[] = [];
    for (const actionID of searchDomain.domain) {
        let memory: CharacterMemory | null = null;
        if (searchDomain.memoryLayer) {
            memory = searchDomain.memoryLayer[actionID];
        }
        const isMatch = await actionMatchesQuery(
            actionID,
            memory,
            queryDefinition,
            roleCastingResult.evaluationContext,
            currentTimestamp
        );
        if (isMatch) {
            matches.push(actionID);
            if (limit && matches.length >= limit) {
                return matches;
            }
        }
    }
    // Finally, return the matches
    return matches;
}

/**
 * Returns whether the given action matches the given query.
 *
 * @param actionID - Entity ID for the action to test against the given search query.
 * @param memory - If we are searching a character's memories, this will be their memory of the given action.
 * @param queryDefinition - Definition for the search query to test against the given action.
 * @param evaluationContext - A Viv evaluation context.
 * @param currentTimestamp - If there is temporal criteria in the query, the current simulation
 *     timestamp, otherwise `null`.
 * @returns Whether the given action matches the given query.
 */
async function actionMatchesQuery(
    actionID: UID,
    memory: CharacterMemory | null,
    queryDefinition: QueryDefinition,
    evaluationContext: EvaluationContext,
    currentTimestamp: DiegeticTimestamp | null,
): Promise<boolean> {
    // Retrieve the action data
    const actionData = await getActionView(actionID);
    // Test the action against the criteria in the query
    for (const setPredicate of queryDefinition.actionName ?? []) {
        if (!(await setPredicateHolds([actionData.name], setPredicate, evaluationContext))) {
            return false;
        }
    }
    for (const setPredicate of queryDefinition.ancestors ?? []) {
        if (!(await setPredicateHolds(actionData.ancestors, setPredicate, evaluationContext))) {
            return false;
        }
    }
    for (const setPredicate of queryDefinition.descendants ?? []) {
        if (!(await setPredicateHolds(actionData.descendants, setPredicate, evaluationContext))) {
            return false;
        }
    }
    if (queryDefinition.importance) {
        if (!(await testNumericCriterion(actionData.importance, queryDefinition.importance, evaluationContext))) {
            return false;
        }
    }
    for (const setPredicate of queryDefinition.tags ?? []) {
        if (!(await setPredicateHolds(actionData.tags, setPredicate, evaluationContext))) {
            return false;
        }
    }
    for (const setPredicate of queryDefinition.location ?? []) {
        if (!(await setPredicateHolds([actionData.location], setPredicate, evaluationContext))) {
            return false;
        }
    }
    for (const temporalPredicate of queryDefinition.time ?? []) {
        if (!testTemporalCriterion(actionData, temporalPredicate, currentTimestamp!)) {
            return false;
        }
    }
    for (const setPredicate of queryDefinition.initiator ?? []) {
        if (!(await setPredicateHolds([actionData.initiator], setPredicate, evaluationContext))) {
            return false;
        }
    }
    for (const setPredicate of queryDefinition.partners ?? []) {
        if (!(await setPredicateHolds(actionData.partners, setPredicate, evaluationContext))) {
            return false;
        }
    }
    for (const setPredicate of queryDefinition.recipients ?? []) {
        if (!(await setPredicateHolds(actionData.recipients, setPredicate, evaluationContext))) {
            return false;
        }
    }
    for (const setPredicate of queryDefinition.bystanders ?? []) {
        if (!(await setPredicateHolds(actionData.bystanders, setPredicate, evaluationContext))) {
            return false;
        }
    }
    for (const setPredicate of queryDefinition.active ?? []) {
        if (!(await setPredicateHolds(actionData.active, setPredicate, evaluationContext))) {
            return false;
        }
    }
    for (const setPredicate of queryDefinition.present ?? []) {
        if (!(await setPredicateHolds(actionData.present, setPredicate, evaluationContext))) {
            return false;
        }
    }
    // If we're searching over a character's memories, also consider the memory-related criteria. If we're
    // searching over the chronicle, we'll simply ignore these fields in lieu of requiring queries to be
    // either memory-queries or general-purpose ones. We want authors to easily use them in both cases.
    if (memory) {
        if (queryDefinition.salience) {
            if (!(await testNumericCriterion(memory.salience, queryDefinition.salience, evaluationContext))) {
                return false;
            }
        }
        for (const setPredicate of queryDefinition.associations ?? []) {
            if (!(await setPredicateHolds(memory.associations, setPredicate, evaluationContext))) {
                return false;
            }
        }
    }
    // If we get to here, the action satisfies all the criteria in the query, so we can safely return `true`
    return true;
}

/**
 * Returns whether the given action-field value falls within the given numeric range.
 *
 * @param actionFieldValue - The action-field value under consideration.
 * @param numericRange - The numeric range to enforce.
 * @param evaluationContext - A Viv evaluation context.
 * @returns Whether the given action-field value falls within the given numeric range.
 * @throws {VivExecutionError} A bound on the numeric range does not evaluate to a number.
 */
async function testNumericCriterion(
    actionFieldValue: number,
    numericRange: QueryNumericRange,
    evaluationContext: EvaluationContext
): Promise<boolean> {
    if (numericRange.lower) {
        const evaluatedLowerBound = await interpretExpression(numericRange.lower.value, evaluationContext);
        if (!isNumber(evaluatedLowerBound)) {
            throw new VivExecutionError(
                // The compiler only allows integers, floats, and enums here, so this error can only
                // arise if an author places here an enum mapping to a non-numeric value.
                "Lower bound in query numeric-criterion range did not evaluate to a number",
                { numericRange, evaluatedLowerBound }
            );
        }
        if (numericRange.lower.inclusive) {
            if (!(actionFieldValue >= evaluatedLowerBound)) {
                return false;
            }
        } else if (!(actionFieldValue > evaluatedLowerBound)) {
            return false;
        }
    }
    if (numericRange.upper) {
        const evaluatedUpperBound = await interpretExpression(numericRange.upper.value, evaluationContext);
        if (!isNumber(evaluatedUpperBound)) {
            throw new VivExecutionError(
                "Upper bound in query numeric-criterion range did not evaluate to a number",
                { numericRange, evaluatedUpperBound }
            );
        }
        if (numericRange.upper.inclusive) {
            if (!(actionFieldValue <= evaluatedUpperBound)) {
                return false;
            }
        } else if (!(actionFieldValue < evaluatedUpperBound)) {
            return false;
        }
    }
    return true;
}

/**
 * Returns whether the given action satisfies the given temporal criterion.
 *
 * Note: Time frames are treated as inclusive, such that a timestamp exactly on a bound
 * of the time frame will be treated as being within the time frame.
 *
 * @param actionData - Entity data for the action in question.
 * @param temporalCriterion - A temporal statement constraining either the performance
 *     timestamp or time of day for the given action.
 * @param currentTimestamp - The current simulation timestamp, in story time.
 * @returns Whether the given action satisfies the given temporal criterion.
 * @throws {VivInternalError} The query has time-of-day criteria, but the action has no time of day (defensive guard).
 */
function testTemporalCriterion(
    actionData: ActionView,
    temporalCriterion: TemporalConstraint,
    currentTimestamp: DiegeticTimestamp
): boolean {
    // Handle a time-of-day criterion
    if (temporalCriterion.type === TemporalStatementDiscriminator.TimeOfDay) {
        if (!actionData.timeOfDay) {
            throw new VivInternalError(
                "Query has time-of-day criteria, but action being tested was not attributed a time of day"
            );
        }
        if (temporalCriterion.open) {
            if (!timeOfDayIsAtOrAfter(actionData.timeOfDay, temporalCriterion.open)) {
                // Return `false` because the action occurred too early in the day
                return false;
            }
        }
        if (temporalCriterion.close) {
            if (timeOfDayIsAtOrAfter(actionData.timeOfDay, temporalCriterion.close)) {
                // Return `false` because the action occurred too late in the day
                return false;
            }
        }
    }
    // Handle a time-frame criterion
    if (temporalCriterion.type === TemporalStatementDiscriminator.TimeFrame) {
        if (temporalCriterion.open) {
            const openTimestamp = groundRelativePointInTime(
                currentTimestamp,
                temporalCriterion.open,
                true
            );
            if (actionData.timestamp < openTimestamp) {
                // Return `false` because the action preceded the time frame
                return false;
            }
        }
        if (temporalCriterion.close) {
            const closeTimestamp = groundRelativePointInTime(
                currentTimestamp,
                temporalCriterion.close,
                true
            );
            if (actionData.timestamp > closeTimestamp) {
                // Return `false` because the action came after the time frame
                return false;
            }
        }
    }
    // If we get to here, the action satisfies the criterion, so we can return `true`
    return true;
}
