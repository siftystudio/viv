import type { DiegeticTimestamp, UID } from "../adapter/types";
import { EntityType } from "../adapter";
import { VivExecutionError } from "../errors";
import { GATEWAY } from "../gateway";
import { getCharacterData } from "../utils";

/**
 * Fades all character memories.
 *
 * This procedure works by reducing all memory `salience` values according to the amount of time
 * that has passed since last invocation of this procedure (and the configured rate of forgetting).
 *
 * @returns Nothing.
 * @throws {VivExecutionError} If story time moved backward since the last memory fade.
 */
export async function fadeMemories(): Promise<void> {
    // Determine the fade multiplier. If we have never faded before, we'll treat the beginning
    // of story time as the last timestamp. If the character's memory was formed since that time,
    // we'll instead use its formation timestamp.
    const vivInternalState = await GATEWAY.getVivInternalState();
    const lastMemoryDecayTimestamp = vivInternalState.lastMemoryDecayTimestamp;
    const currentTimestamp = await GATEWAY.getCurrentTimestamp();
    if (lastMemoryDecayTimestamp !== null && lastMemoryDecayTimestamp > currentTimestamp) {
        throw new VivExecutionError(
            "Story time appears to have moved backward since the last memory fade",
            { lastMemoryDecayTimestamp, currentTimestamp }
        );
    }
    // Fade all character memories accordingly
    const allCharacterIDs = await GATEWAY.getEntityIDs(EntityType.Character);
    const allPromises: Promise<void>[] = [];
    for (const characterID of allCharacterIDs) {
        allPromises.push(fadeMemoriesForCharacter(characterID, lastMemoryDecayTimestamp, currentTimestamp));
    }
    await Promise.all(allPromises);
    // Record the timestamp of this invocation of the procedure
    vivInternalState.lastMemoryDecayTimestamp = currentTimestamp;
    await GATEWAY.saveVivInternalState(vivInternalState);
}

/**
 * Fades all memories for the given character, relative to the amount of time that has passed.
 *
 * @param characterID - Entity ID for the character whose memories are to be faded.
 * @param lastMemoryDecayTimestamp - The story-time timestamp when memory decay was last carried out.
 * @param currentTimestamp - The current story-time timestamp.
 * @returns Nothing.
 * @throws {VivExecutionError} If a character memory has a formation timestamp in the future.
 */
async function fadeMemoriesForCharacter(
    characterID: UID,
    lastMemoryDecayTimestamp: DiegeticTimestamp | null,
    currentTimestamp: DiegeticTimestamp
): Promise<void> {
    const characterData = await getCharacterData(characterID);
    for (const [actionID, memory] of Object.entries(characterData.memories)) {
        if (memory.forgotten) {
            continue;
        }
        const anchorTimestamp = Math.max(lastMemoryDecayTimestamp ?? 0, memory.formationTimestamp);
        const minutesElapsed = currentTimestamp - anchorTimestamp;
        if (minutesElapsed === 0) {
            continue;
        } else if (minutesElapsed < 0) {
            throw new VivExecutionError(
                "Character memory appears to have been formed in the future",
                { characterID, memory }
            );
        }
        const monthsElapsed = minutesElapsed / MINUTES_PER_MONTH;
        const fadeMultiplier = GATEWAY.config.memoryRetentionMonthlyMultiplier ** monthsElapsed;
        memory.salience *= fadeMultiplier;
        if (memory.salience < GATEWAY.config.memoryForgettingSalienceThreshold) {
            memory.forgotten = true;
        }
        await GATEWAY.saveCharacterMemory(characterID, actionID, memory);
    }
}

/**
 * The number of minutes in a month.
 */
const MINUTES_PER_MONTH = 365 / 12 * 24 * 60;
