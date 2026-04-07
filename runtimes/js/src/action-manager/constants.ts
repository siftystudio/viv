/**
 * Enum containing the Viv special role names that all actions automatically bind.
 */
export enum SpecialRoleName {
    /**
     * Role that is always bound to the entity ID for the action itself, allowing self-reference.
     */
    This = "this",
    /**
     * Role that is bound to someone learning about (or being re-exposed to) an action secondhand.
     */
    Hearer = "hearer",
}
