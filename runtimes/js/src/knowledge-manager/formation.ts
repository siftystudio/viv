import type { ActionView } from "../adapter/types";
import type { EvaluationContext } from "../interpreter/types";
import type { CharacterMemory } from "./types";
import { GATEWAY } from "../gateway";
import { clampSalience, computeAssociations, computeSalienceIncrement } from "./utils";

/**
 * Form memories of the given action for all its direct observers (including participants).
 *
 * Cases of a character learning about an action later on are handled by the {@link processRelayedActions} function.
 *
 * Note: If the initial salience value for a new memory is lower than the forgetting threshold, it will not
 * immediately be marked as forgotten, but instead this will occur the first time the memory is faded.
 *
 * @param actionView - Action view for the action for which memories will be formed.
 * @param context - A Viv evaluation context.
 * @returns Nothing. The memories are persisted via side effects.
 */
export async function formMemories(actionView: ActionView, context: EvaluationContext): Promise<void> {
    const currentTimestamp = await GATEWAY.getCurrentTimestamp();
    for (const observerID of actionView.present) {
        const initialSalience = clampSalience(await computeSalienceIncrement(observerID, actionView, context));
        const initialAssociations = await computeAssociations(observerID, actionView, context);
        const memory: CharacterMemory = {
            action: actionView.id,
            formationTimestamp: currentTimestamp,
            salience: initialSalience,
            associations: initialAssociations,
            sources: [actionView.id],
            forgotten: false
        };
        await GATEWAY.saveCharacterMemory(observerID, actionView.id, memory);
    }
}
