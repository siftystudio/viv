import type { UID } from "../adapter/types";
import type { QueryDefinition, SiftingPatternDefinition } from "../content-bundle/types";
import type { EntityReference, SearchDomainDeclaration } from "../dsl/types";
import type { RunSearchQueryArgs, RunSearchQueryResult, RunSiftingPatternArgs, RunSiftingPatternResult } from "./dto";
import { EntityType } from "../adapter";
import { ExpressionDiscriminator, SearchDomainPreparationPolicy } from "../dsl";
import type { VivInterpreterError } from "../errors";
import { VivNotInitializedError, VivValidationError, ValidationErrorSubject } from "../errors";
import { prepareDummyEvaluationContext } from "../interpreter";
import { GATEWAY } from "../gateway";
import { SCHEMA_VALIDATORS, validateAgainstSchema } from "../schemas";
import { runActionSearch, runSiftingPattern } from "../story-sifter";
import { getQueryDefinition, getSiftingPatternDefinition, isEntityOfType, isString } from "../utils";
import { vivRuntimeIsInitializedAPI } from "./init";

/**
 * Executes the given search query over the specified search domain, and returns entity IDs for matching actions.
 *
 * @category Story Sifting
 * @example
 * ```ts
 * const matches = await runSearchQuery({
 *     queryName: "proud-of-child",
 *     precastBindings: { parent: ["cid-alice"] },
 *     searchDomain: "cid-alice",
 *     limit: 10
 * });
 * if (!matches.length) {
 *     console.log("No matches found");
 * }
 * ```
 * @param args - See {@link RunSearchQueryArgs}.
 * @returns - See {@link RunSearchQueryResult}.
 * @throws {@link VivNotInitializedError} If Viv has not been initialized.
 * @throws {@link VivInterpreterError} If the Viv interpreter encounters an issue in the course of query execution.
 * @throws {@link VivValidationError} If the supplied `args` do not conform to the expected schema.
 * @throws {@link VivValidationError} If there is no defined search query with the given `queryName`.
 * @throws {@link VivValidationError} If `searchDomain` is provided, but is not the entity ID for a character.
 */
export async function runSearchQueryAPI(args: RunSearchQueryArgs): Promise<RunSearchQueryResult> {
    // Confirm that Viv has been initialized
    if (!vivRuntimeIsInitializedAPI()) {
        throw new VivNotInitializedError(
            `Cannot run search query '${args.queryName}' (Viv has not been initialized)`
        );
    }
    // Pending the adapter configuration, structurally validate the args
    if (GATEWAY.debug?.validateAPICalls) {
        validateAgainstSchema<RunSearchQueryArgs>(
            args,
            SCHEMA_VALIDATORS.runSearchQueryArgs,
            ValidationErrorSubject.APICall
        );
    }
    // Retrieve the definition for the specified query
    let queryDefinition: QueryDefinition;
    try {
        queryDefinition = getQueryDefinition(args.queryName);
    } catch {
        throw new VivValidationError(
            `Cannot run search query '${args.queryName}'`,
            ValidationErrorSubject.APICall,
            ["Query is not defined in the registered content bundle"]
        );
    }
    // If `limit` is present, confirm it's greater than or equal to one
    if (args.limit && args.limit < 1) {
        throw new VivValidationError(
            `Cannot run search query '${args.queryName}'`,
            ValidationErrorSubject.APICall,
            ["limit must be >= 1"]
        );
    }
    // If `searchDomain` is present, confirm that it's an entity ID for a character
    if (args.searchDomain) {
        if (!isString(args.searchDomain) || !(await GATEWAY.isEntityID(args.searchDomain))) {
            throw new VivValidationError(
                `Cannot run search query '${args.queryName}'`,
                ValidationErrorSubject.APICall,
                [`searchDomain is not an entity ID: '${args.searchDomain}'`]
            );
        }
        if (!(await isEntityOfType(args.searchDomain, EntityType.Character))) {
            throw new VivValidationError(
                `Cannot run search query '${args.queryName}'`,
                ValidationErrorSubject.APICall,
                [`searchDomain is not an entity ID for a character: '${args.searchDomain}'`]
            );
        }
    }
    // Mock up a search-domain declaration incorporating the specified character, if any
    const searchDomainDeclaration = mockUpSearchDomainDeclaration(args.searchDomain ?? null);
    // Now mock up a minimal evaluation context that binds the search domain as a local variable,
    // as applicable. This will allow our mocked-up search-domain expression to evaluate properly.
    const enclosingEvaluationContext = prepareDummyEvaluationContext();
    if (args.searchDomain) {
        enclosingEvaluationContext.__locals__[SEARCH_DOMAIN_LOCAL_VARIABLE_NAME] = args.searchDomain;
    }
    // Finally, invoke the story sifter to run the search query, and return the result
    return await runActionSearch(
        queryDefinition,
        args.precastBindings ?? {},
        searchDomainDeclaration,
        enclosingEvaluationContext,
        args.limit
    );
}

/**
 * Returns a mocked-up search-domain declaration.
 *
 * @param searchDomain - Entity ID for the character whose memories will be searched, if any,
 *     else `null` if the search domain will be the entire chronicle (all historical actions).
 * @returns A mocked-up search-domain declaration.
 */
function mockUpSearchDomainDeclaration(searchDomain: UID | null): SearchDomainDeclaration {
    // If applicable, prepare a search-domain expression in the form of an entity reference
    // to a local variable that will soon store the entity ID of the character who has been
    // specified to search as the search domain.
    let searchDomainExpression: EntityReference | null = null;
    if (searchDomain) {
        searchDomainExpression = {
            type: ExpressionDiscriminator.EntityReference,
            value: {
                anchor: SEARCH_DOMAIN_LOCAL_VARIABLE_NAME,
                path: [],
                local: true,
                group: false,
                failSafe: false
            },
            source: null,
            negated: false
        };
    }
    // Prepare a search-domain declaration
    const searchDomainDeclaration: SearchDomainDeclaration = {
        policy: searchDomain ? SearchDomainPreparationPolicy.Expression : SearchDomainPreparationPolicy.Chronicle,
        expression: searchDomainExpression,
    };
    return searchDomainDeclaration;
}

/**
 * Runs the specified sifting pattern over the specified search domain, and returns
 * a single match, if one can be found, else `null`.
 *
 * @category Story Sifting
 * @example
 * ```ts
 * const match = await runSiftingPattern({
 *     patternName: "rags-to-riches",
 *     precastBindings: { protagonist: ["cid-alice"] },
 *     searchDomain: "cid-alice"
 * });
 * if (!match) {
 *     console.log("No match found");
 * }
 * ```
 * @param args - See {@link RunSiftingPatternArgs}.
 * @returns - See {@link RunSiftingPatternResult}.
 * @throws {@link VivNotInitializedError} If Viv has not been initialized.
 * @throws {@link VivInterpreterError} If the Viv interpreter encounters an issue in the course of sifting.
 * @throws {@link VivValidationError} If the supplied `args` do not conform to the expected schema.
 * @throws {@link VivValidationError} If there is no defined sifting pattern with the given `patternName`.
 * @throws {@link VivValidationError} If `searchDomain` is provided, but is not the entity ID for a character.
 */
export async function runSiftingPatternAPI(args: RunSiftingPatternArgs): Promise<RunSiftingPatternResult> {
    // Confirm that Viv has been initialized
    if (!vivRuntimeIsInitializedAPI()) {
        throw new VivNotInitializedError(
            `Cannot run sifting pattern '${args.patternName}' (Viv has not been initialized)`
        );
    }
    // Pending the adapter configuration, structurally validate the args
    if (GATEWAY.debug?.validateAPICalls) {
        validateAgainstSchema<RunSiftingPatternArgs>(
            args,
            SCHEMA_VALIDATORS.runSiftingPatternArgs,
            ValidationErrorSubject.APICall
        );
    }
    // Retrieve the definition for the specified sifting pattern
    let patternDefinition: SiftingPatternDefinition;
    try {
        patternDefinition = getSiftingPatternDefinition(args.patternName);
    } catch {
        throw new VivValidationError(
            `Cannot run sifting pattern '${args.patternName}'`,
            ValidationErrorSubject.APICall,
            ["Sifting pattern is not defined in the registered content bundle"]
        );
    }
    // If `searchDomain` is present, confirm that it's an entity ID for a character
    if (args.searchDomain) {
        if (!isString(args.searchDomain) || !(await GATEWAY.isEntityID(args.searchDomain))) {
            throw new VivValidationError(
                `Cannot run sifting pattern '${args.patternName}'`,
                ValidationErrorSubject.APICall,
                [`searchDomain is not an entity ID: '${args.searchDomain}'`]
            );
        }
        if (!(await isEntityOfType(args.searchDomain, EntityType.Character))) {
            throw new VivValidationError(
                `Cannot run sifting pattern '${args.patternName}'`,
                ValidationErrorSubject.APICall,
                [`searchDomain is not an entity ID for a character: '${args.searchDomain}'`]
            );
        }
    }
    // Mock up a search-domain declaration incorporating the specified character, if any
    const searchDomainDeclaration = mockUpSearchDomainDeclaration(args.searchDomain ?? null);
    // Now mock up a minimal evaluation context that binds the search domain as a local variable,
    // as applicable. This will allow our mocked-up search-domain expression to evaluate properly.
    const enclosingEvaluationContext = prepareDummyEvaluationContext();
    if (args.searchDomain) {
        enclosingEvaluationContext.__locals__[SEARCH_DOMAIN_LOCAL_VARIABLE_NAME] = args.searchDomain;
    }
    // Invoke the story sifter to run the pattern, returning the result
    return await runSiftingPattern(
        patternDefinition,
        args.precastBindings ?? {},
        searchDomainDeclaration,
        enclosingEvaluationContext
    );
}

/**
 * A dummy name used for the local variable storing the entity ID for the character
 * whose memories will be searched, as applicable.
 */
const SEARCH_DOMAIN_LOCAL_VARIABLE_NAME = "__searchDomainCharacter__";
