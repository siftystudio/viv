import type { CharacterView } from "../adapter/types";
import type { Expression, SearchDomainDeclaration, SetPredicate } from "../dsl/types";
import type { EvaluationContext, ExpressionValue } from "../interpreter/types";
import type { SearchDomain } from "./types";
import { EntityType } from "../adapter";
import { SearchDomainPreparationPolicy, SetPredicateOperator } from "../dsl";
import { VivExecutionError, VivInternalError } from "../errors";
import { GATEWAY } from "../gateway";
import { interpretExpression } from "../interpreter";
import { dehydrateEntityReference, isEntityView } from "../utils";

/**
 * Returns a prepared search domain.
 *
 * A search domain is structured as an array of entity IDs for actions, with an optional layer of associated
 * memories in cases where the search is over a character's knowledge. In such cases, the domain can only
 * include actions that the character know about (and has not forgotten about). Otherwise, it can include
 * any action in the chronicle, meaning any action that has ever occurred.
 *
 * @param searchDomainDeclaration - A declaration for how to construct the search domain.
 * @param enclosingEvaluationContext - The Viv evaluation context for the closure containing a search expression.
 * @returns A prepared search domain.
 * @throws {VivInternalError} If the declaration specifies an unsupported domain-preparation policy (defensive guard).
 */
export async function prepareSearchDomain(
    searchDomainDeclaration: SearchDomainDeclaration,
    enclosingEvaluationContext: EvaluationContext,
): Promise<SearchDomain> {
    switch (searchDomainDeclaration.policy) {
        // If declaration specifies to inherit the enclosing domain, simply return the enclosing context
        case SearchDomainPreparationPolicy.Inherit:
            return prepareInheritedSearchDomain(enclosingEvaluationContext);
        case SearchDomainPreparationPolicy.Chronicle:
            return await prepareChronicleSearchDomain(enclosingEvaluationContext);
        case SearchDomainPreparationPolicy.Expression:
            return await prepareCustomSearchDomain(searchDomainDeclaration, enclosingEvaluationContext);
        default:
            throw new VivInternalError(
                `Encountered unexpected search-domain preparation policy: ${searchDomainDeclaration.policy}`
            );
    }
}

/**
 * The search domain in the enclosing evaluation context, after first ensuring it has one.
 *
 * @param enclosingEvaluationContext - The Viv evaluation context for the closure containing a search expression.
 * @returns The search domain in the enclosing evaluation context.
 * @throws {VivInternalError} If there is no enclosing domain (defensive guard).
 */
function prepareInheritedSearchDomain(enclosingEvaluationContext: EvaluationContext): SearchDomain {
    if (!enclosingEvaluationContext.__searchDomain__) {
        throw new VivInternalError(
            "Preparing search domain with 'inherit' policy, but there is no enclosing search domain"
        );
    }
    return enclosingEvaluationContext.__searchDomain__;
}

/**
 * Returns a search domain covering the full chronicle (all historical actions).
 *
 * @param enclosingEvaluationContext - The Viv evaluation context for the closure containing a search expression.
 * @returns A search domain covering the full chronicle.
 * @throws {VivInternalError} If there is an enclosing domain (defensive guard).
 */
async function prepareChronicleSearchDomain(enclosingEvaluationContext: EvaluationContext): Promise<SearchDomain> {
    if (enclosingEvaluationContext.__searchDomain__) {
        throw new VivInternalError(
            "Preparing search domain with 'chronicle' policy, but there is an enclosing search domain"
        );
    }
    const allActionIDs = await GATEWAY.getEntityIDs(EntityType.Action);
    const searchDomain: SearchDomain = {
        domain: allActionIDs,
        memoryLayer: null
    };
    return searchDomain;
}

/**
 * Returns a search domain narrowed to a specified character's memories.
 *
 * If there is a search domain included in the given enclosing evaluation context, which occurs when query
 * searches and/or siftings nest another, then the search domain here will be narrowed to the intersection
 * of the two search domains.
 *
 * Note: We do not include actions in the domain when the corresponding memory has been marked
 * {@link CharacterMemory.forgotten}.
 *
 * @param searchDomainDeclaration - A declaration for how to construct the search domain.
 * @param enclosingEvaluationContext - The Viv evaluation context for the closure containing a search expression.
 * @returns A search domain narrowed to a specified character's memories.
 * @throws {VivExecutionError} If the search-domain expression does not evaluate to an entity ID for a character.
 */
async function prepareCustomSearchDomain(
    searchDomainDeclaration: SearchDomainDeclaration,
    enclosingEvaluationContext: EvaluationContext,
): Promise<SearchDomain> {
    const evaluatedDomainExpression = await interpretExpression(
        searchDomainDeclaration.expression as Expression,
        enclosingEvaluationContext
    );
    if (!isEntityView(evaluatedDomainExpression)) {
        throw new VivExecutionError(
            "Bad search domain: search-domain expression did not evaluate to an entity",
            { domainExpression: searchDomainDeclaration.expression, evaluatedDomainExpression }
        );
    }
    if (evaluatedDomainExpression.entityType !== EntityType.Character) {
        throw new VivExecutionError(
            "Bad search domain: search-domain expression did not evaluate to a character",
            { domainExpression: searchDomainDeclaration.expression, evaluatedDomainExpression }
        );
    }
    const characterData = evaluatedDomainExpression as CharacterView;
    let searchDomainActionIDs =
        Object.keys(characterData.memories).filter(actionID => !characterData.memories[actionID].forgotten);
    const searchDomainMemoryLayer = characterData.memories;
    // If there is an enclosing search domain, narrow to the intersection of the two domains. The memory
    // layer does not need to be narrowed, since we only retrieve memories for domain actions.
    if (enclosingEvaluationContext.__searchDomain__) {
        const innerSearchDomainActionIDsSet = new Set(searchDomainActionIDs);
        searchDomainActionIDs = enclosingEvaluationContext.__searchDomain__.domain.filter(
            actionID => innerSearchDomainActionIDsSet.has(actionID)
        );
    }
    // Finally, package up the search domain and return it
    const searchDomain: SearchDomain = {
        domain: searchDomainActionIDs,
        memoryLayer: searchDomainMemoryLayer
    }
    return searchDomain;
}

/**
 * Returns whether the given set predicate holds with regard to the given candidate field value.
 *
 * @param candidateFieldValue - The value of a field that will be treated as a set and
 *     tested against the set contained in the predicate.
 * @param setPredicate - The set predicate to test, containing the operator and also
 *     the set associated with the predicate.
 * @param evaluationContext - A Viv evaluation context.
 * @returns Whether the given set predicate holds with regard to the given action-field set.
 * @throws {VivInternalError} If the set-predicate operator is invalid (defensive guard).
 */
export async function setPredicateHolds(
    candidateFieldValue: ExpressionValue[],
    setPredicate: SetPredicate,
    evaluationContext: EvaluationContext
): Promise<boolean> {
    // Prepare the sets in question
    const actionFieldSet = new Set(candidateFieldValue);
    const operandSet: Set<ExpressionValue> = new Set();
    for (const operandComponentExpression of setPredicate.operand) {
        const evaluatedOperandComponent = await interpretExpression(
            operandComponentExpression,
            evaluationContext
        );
        const dehydratedOperandComponent = dehydrateEntityReference(evaluatedOperandComponent);
        operandSet.add(dehydratedOperandComponent);
    }
    // Test the predicate
    switch (setPredicate.operator) {
        case SetPredicateOperator.None:
            return [...operandSet].every(member => !actionFieldSet.has(member))
        case SetPredicateOperator.Any:
            return [...operandSet].some(member => actionFieldSet.has(member))
        case SetPredicateOperator.All:
            return [...operandSet].every(member => actionFieldSet.has(member))
        case SetPredicateOperator.Exactly:
            return (
                actionFieldSet.size === operandSet.size &&
                [...operandSet].every(member => actionFieldSet.has(member))
            )
        default:
            // Belt and suspenders
            throw new VivInternalError(`Invalid operator in set predicate: '${setPredicate.operator}'`);
    }
}
