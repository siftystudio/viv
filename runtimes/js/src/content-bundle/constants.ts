/**
 * Enum specifying the discriminators for all Viv construct types.
 */
export enum ConstructDiscriminator {
    /**
     * Discriminator for action definitions.
     */
    Action = "action",
    /**
     * Discriminator for action-selector definitions.
     */
    ActionSelector = "actionSelector",
    /**
     * Discriminator for plan definitions.
     */
    Plan = "plan",
    /**
     * Discriminator for plan-selector definitions.
     */
    PlanSelector = "planSelector",
    /**
     * Discriminator for query definitions.
     */
    Query = "query",
    /**
     * Discriminator for sifting-pattern definitions.
     */
    SiftingPattern = "siftingPattern",
    /**
     * Discriminator for trope definitions.
     */
    Trope = "trope"
}

/**
 * Enum specifying the entity types that may be associated with a role definition.
 */
export enum RoleEntityType {
    /**
     * The role casts an action.
     */
    Action = "action",
    /**
     * The role casts a character.
     */
    Character = "character",
    /**
     * The role casts an item.
     */
    Item = "item",
    /**
     * The role casts a location.
     */
    Location = "location",
    /**
     * The role casts a symbol.
     */
    Symbol = "symbol",
}

/**
 * Enum specifying the participation modes for action roles that cast characters.
 *
 * To be clear, these are *only* applicable to action roles that cast characters.
 */
export enum RoleParticipationMode {
    /**
     * The role casts a bystander who is an uninvolved witness to the associated action.
     */
    Bystander = "bystander",
    /**
     * The role casts the single initiator of an action.
     */
    Initiator = "initiator",
    /**
     * The role casts a partner who helps to initiate an action.
     */
    Partner = "partner",
    /**
     * The role casts a recipient of an action.
     */
    Recipient = "recipient",
}
