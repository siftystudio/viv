import type { CharacterMemories, UID } from "../adapter/types";
import type { RoleName } from "../content-bundle/types";

/**
 * A prepared search domain, ready for use in story sifting.
 */
export interface SearchDomain {
    /**
     * An array containing entity IDs for all actions in the search domain at hand.
     */
    readonly domain: UID[];
    /**
     * If applicable, the memories associated with the actions in the search domain.
     *
     * This layer is needed to evaluate query criteria pertaining to saliences and associations.
     *
     * If we are searching over the full chronicle, this will be elided.
     */
    readonly memoryLayer: CharacterMemories | null;
}

/**
 * A match for a sifting pattern.
 *
 * This takes the form of a mapping from the role names for the actions defined in
 * the pattern to entity IDs for the actions that were cast in those action roles.
 *
 * If a search domain was specified for the sifting expression, the result will only
 * include actions that are known to the character specified as the search domain.
 *
 * @category Other
 */
export type SiftingMatch = Record<RoleName, UID[]>
