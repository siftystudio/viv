import type { UID } from "../adapter/types";
import type { SiftingPatternDefinition } from "../content-bundle/types";
import type { SearchDomainDeclaration } from "../dsl/types";
import type { EvaluationContext } from "../interpreter/types";
import type { RoleBindings } from "../role-caster/types";
import type { SiftingMatch } from "./types";
import { castRoles } from "../role-caster";
import { prepareSearchDomain } from "./utils";

/**
 * Runs the specified sifting pattern over the specified search domain, and returns a single match,
 * if one can be found, else `null`.
 *
 * A match takes the form of a mapping from the sifting pattern's action role names to their associated bindings.
 *
 * @param patternDefinition - Definition for the sifting pattern to run.
 * @param searchDomainDeclaration - A specification for how to construct a search domain.
 * @param precastBindings - Precast bindings for the sifting pattern.
 * @param enclosingEvaluationContext - The Viv evaluation context for the closure containing the action search,
 *     which must be loaded with precast bindings to facilitate evaluating the search-domain expression.
 * @returns A sifting match, if one was found, else `null`.
 */
export async function runSiftingPattern(
    patternDefinition: SiftingPatternDefinition,
    precastBindings: RoleBindings,
    searchDomainDeclaration: SearchDomainDeclaration,
    enclosingEvaluationContext: EvaluationContext,
): Promise<SiftingMatch | null> {
    // First, prepare the search domain, which will be structured as an array of entity IDs for actions
    const searchDomain = await prepareSearchDomain(searchDomainDeclaration, enclosingEvaluationContext);
    // Attempt role casting for the sifting pattern. If this succeeds, we will have found
    // a match for the sifting pattern in the specified search domain.
    const roleCastingResult = await castRoles(patternDefinition, precastBindings, searchDomain);
    // If role casting failed, there was no match for the sifting pattern in the specified
    // search domain, so we must return `null` now.
    if (!roleCastingResult.bindings) {
        return null;
    }
    // Otherwise, construct a match result by isolating the bindings for the actions in the sifting pattern
    const match: SiftingMatch = {};
    for (const actionRoleName of patternDefinition.actions) {
        match[actionRoleName] = roleCastingResult.bindings[actionRoleName] as UID[];
    }
    // Finally, return the match
    return match;
}
