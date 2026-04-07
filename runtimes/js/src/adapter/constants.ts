/**
 * Enum containing discriminators for the Viv entity types.
 *
 * @category Other
 */
export enum EntityType {
    /**
     * A character in a simulated storyworld.
     *
     * In Viv, characters can serve in character roles, including `initiator` roles, and they form
     * memories when they experience or otherwise learn about actions.
     *
     * The host application must be able to furnish a {@link CharacterView} for any character, via
     * {@link HostApplicationAdapter.getEntityView}, and it must be able to furnish IDs for all characters
     * that are currently situated at a specified location, via {@link HostApplicationAdapter.getEntityIDs}.
     */
    Character = "character",
    /**
     * An item or prop or artifact in a simulated storyworld.
     *
     * In Viv, items are entities that can be cast in `item` roles, and on which knowledge of past
     * actions may be {@link ItemView.inscriptions}. Items do not take action or form
     * memories, but otherwise the exact sense of 'item' will depend on your host application.
     *
     * The host application must be able to furnish an {@link ItemView} for any item, via
     * {@link HostApplicationAdapter.getEntityView}, and it must be able to furnish IDs for all items
     * that are currently situated at a specified location, via {@link HostApplicationAdapter.getEntityIDs}.
     */
    Item = "item",
    /**
     * A location in a simulated storyworld.
     *
     * In Viv, locations are entities that can be cast in `location` roles.
     *
     * The host application must be able to furnish a {@link LocationView} for any location, via
     * {@link HostApplicationAdapter.getEntityView}, and it must be able to furnish IDs for all
     * locations in the storyworld at hand, via {@link HostApplicationAdapter.getEntityIDs}.
     */
    Location = "location",
    /**
     * An action that has occurred in a simulated storyworld.
     *
     * In Viv, actions are treated as entities that can be cast in `action` roles.
     *
     * The host application must be able to furnish an {@link ActionView} for any action, via
     * {@link HostApplicationAdapter.getEntityView}, and it must be able to furnish all actions
     * in the storyworld at hand, via {@link HostApplicationAdapter.getEntityIDs}.
     */
    Action = "action",
}
