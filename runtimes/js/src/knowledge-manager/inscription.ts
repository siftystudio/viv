import type { UID } from "../adapter/types";
import { GATEWAY } from "../gateway";
import { getEvaluationContextFromBindings } from "../interpreter";
import { getActionDefinition, getActionView } from "../utils";
import { processRelayedAction } from "./propagation";

/**
 * Inscribe knowledge about the given action into the given item.
 *
 * Should a character later inspect this item, they will learn about the given action.
 *
 * Note: This procedure is idempotent, meaning the inscriptions for an item will never contain duplicates.
 *
 * @param itemID - Entity ID for the item whose inscriptions will be updated.
 * @param actionID - Entity ID for the action about which knowledge will be inscribed into the given item.
 * @returns Nothing. The update is executed via side effects.
 */
export async function inscribeItem(itemID: UID, actionID: UID): Promise<void> {
    const inscriptions = await GATEWAY.getItemInscriptions(itemID);
    if (!(inscriptions.includes(actionID))) {
        inscriptions.push(actionID);
        await GATEWAY.saveItemInscriptions(itemID, inscriptions);
    }
}

/**
 * Simulate the given character inspecting the given item, and thereby learning about
 * any actions about which the item inscribes knowledge.
 *
 * @param characterID - Entity ID for the character who is inspecting the given item.
 * @param itemID - Entity ID for the item that is being inspected by the given character.
 * @param inspectionActionID - Entity ID for the action that triggered this inspection (e.g., via an effect).
 * @returns Nothing. The character's knowledge is updated via side effects.
 */
export async function inspectItem(
    characterID: UID,
    itemID: UID,
    inspectionActionID: UID
): Promise<void> {
    const inscriptions = await GATEWAY.getItemInscriptions(itemID);
    if (!inscriptions.length) {
        return;
    }
    for (const relayedActionID of inscriptions) {
        const relayedActionData = await getActionView(relayedActionID);
        const relayedActionDefinition = getActionDefinition(relayedActionData.name);
        const evaluationContext = getEvaluationContextFromBindings(
            relayedActionDefinition,
            relayedActionData.bindings
        );
        const currentTimestamp = await GATEWAY.getCurrentTimestamp();
        await processRelayedAction(
            characterID,
            inspectionActionID,
            relayedActionData,
            evaluationContext,
            currentTimestamp
        );
    }
}
