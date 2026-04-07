import type { DiegeticTimestamp, UID } from "../adapter/types";

/**
 * A character's (subjective) knowledge of an action that has occurred in a
 * simulated storyworld, including metadata like salience and associations.
 *
 * @category Knowledge
 */
export interface CharacterMemory {
    /**
     * Entity ID for the action that is the subject of this memory.
     */
    readonly action: UID;
    /**
     * The story-time timestamp when the memory was first formed.
     */
    readonly formationTimestamp: DiegeticTimestamp;
    /**
     * A numeric value capturing how noteworthy the action is to the character who holds this memory.
     *
     * This is also operationalized as the *strength* of the memory, with forgetting being modeled
     * by reducing this increment over time.
     */
    salience: number;
    /**
     * A set of tags representing subjective associations held by the character at hand with
     * regard to the action that is the subject of this memory.
     *
     * This is always deduplicated.
     */
    associations: string[];
    /**
     * An array containing entity IDs for all the actions that have led to this person learning or
     * hearing about this action.
     *
     * For direct observers of the action, the value will begin as a singleton array containing the
     * action itself. For characters who learn about it secondhand, via another action or an item
     * inspection, the array will initially contain only the action that relayed this knowledge.
     *
     * In any event, over time the array may grow as a character recalls or imparts the action,
     * or hears about it again later on from other characters.
     */
    readonly sources: UID[];
    /**
     * Whether the memory has been forgotten.
     *
     * A memory is forgotten when its salience falls below the {@link HostApplicationAdapterConfig.memoryForgettingSalienceThreshold}.
     */
    forgotten: boolean;
}
