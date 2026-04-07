import { VivNotInitializedError } from "../errors";
import { fadeMemories } from "../knowledge-manager";
import { vivRuntimeIsInitializedAPI } from "./init";

/**
 * Invokes the knowledge manager to fade all character memories.
 *
 * This procedure works by reducing all memory `salience` values according to the amount of time
 * that has passed since last invocation of this procedure and the configured rate of forgetting,
 * which is specified in {@link HostApplicationAdapterConfig}.
 *
 * @category Knowledge
 * @example
 * ```ts
 * await fadeCharacterMemories();
 * ```
 * @see Memory-related configuration parameters in {@link HostApplicationAdapterConfig}.
 * @returns Nothing. Memories are faded via side effects.
 * @throws {@link VivNotInitializedError} If Viv is not initialized.
 */
export async function fadeCharacterMemoriesAPI(): Promise<void> {
    // Confirm that Viv has been initialized
    if (!vivRuntimeIsInitializedAPI()) {
        throw new VivNotInitializedError(`Cannot fade memories (Viv has not been initialized)`);
    }
    // Invoke the knowledge manager to fade all character memories
    await fadeMemories();
}
