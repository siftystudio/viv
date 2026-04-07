import type { ActionView, DiegeticTimestamp, UID } from "../adapter/types";
import type { EvaluationContext } from "../interpreter/types";
import type { CharacterMemory } from "./types";
import { SpecialRoleName, executeEffects, triggerReactions } from "../action-manager";
import { GATEWAY } from "../gateway";
import { getEvaluationContextFromBindings } from "../interpreter";
import { clone, getActionDefinition, getActionView } from "../utils";
import { clampSalience, computeAssociations, computeSalienceIncrement } from "./utils";

/**
 * Simulates phenomena associated with a character hearing about a past action, potentially for the first time.
 *
 * For all direct observers of the given action (participants and bystanders), this function handles
 * memory formation and updating for any actions about which knowledge is *relayed* by the given one.
 *
 * @param relayingActionView - Action view for an action that has just occurred, which may
 *     relay knowledge about past actions.
 * @returns Nothing. The memories are created and modified via side effects.
 */
export async function processRelayedActions(relayingActionView: ActionView): Promise<void> {
    const currentTimestamp = await GATEWAY.getCurrentTimestamp();
    for (const relayedActionID of relayingActionView.relayedActions) {
        const relayedActionData = await getActionView(relayedActionID);
        const relayedActionDefinition = getActionDefinition(relayedActionData.name);
        const evaluationContext = getEvaluationContextFromBindings(
            relayedActionDefinition,
            relayedActionData.bindings
        );
        for (const observerID of relayingActionView.present) {
            await processRelayedAction(
                observerID,
                relayingActionView.id,
                relayedActionData,
                evaluationContext,
                currentTimestamp
            );
        }
    }
}

/**
 * Prepares a post-hoc evaluation context, meaning one that is suitable for handling effects and
 * reactions for a past action that a character is learning about for the first time.
 *
 * @param evaluationContext - A Viv evaluation context.
 * @param pastActionView - Action view for the past action whose effects and reactions are to be handled.
 * @param hearerID - Entity ID for the character who is learning about the past action for the
 *     first time. In such a case, we'll only execute effects referencing the `hearer` role.
 * @param relayingActionID - Entity ID for the action being performed right now, which relays knowledge about
 *     the given past action. If a reaction is triggered, this knowledge-relaying action will also be marked
 *     as a cause of that reaction. See my long note in {@link compileActionCauses} for more information.
 * @returns A Viv evaluation context that incorporates action causes and binds the `hearer` role, as applicable.
 */
function preparePostHocEvaluationContext(
    evaluationContext: EvaluationContext,
    pastActionView: ActionView,
    hearerID: UID,
    relayingActionID: UID
): EvaluationContext {
    // First, we need to make a copy of the evaluation context, since we'll end up reusing it
    // for multiple characters, each of whom will be placed in the `hearer` field.
    const postHocEvaluationContext = clone<EvaluationContext>(evaluationContext);
    // Add in the causes that will be attributed to any reaction, should one be triggered and ultimately be
    // performed. Due to reaction declarations potentially being wrapped in Viv loops and conditionals, the
    // only way to reliably pass these causes through to the interpreter function that ends up needing them
    // is to insert them into the evaluation context.
    const reactionCauses: UID[] = [
        // Important: The past action *must* come first here. This policy allows us to reliably retrieve
        // the timestamp of this action should we need to ground the temporal constraints on any reaction
        // to it. For instance, the definition for the past action may cause another character to plot
        // revenge, but only if it's been less than ten years since the past action occurred.
        pastActionView.id,
        relayingActionID
    ];
    postHocEvaluationContext.__causes__ = reactionCauses;
    // Since we're executing material for a secondhand recipient of knowledge of this action,
    // we want to add them into the evaluation context.
    postHocEvaluationContext[SpecialRoleName.Hearer] = hearerID;
    // Finally, return the post-hoc evaluation context
    return postHocEvaluationContext;
}

/**
 * Updates the given character's knowledge of the given relayed action.
 *
 * This function is called when a character observes or hears about an action relaying knowledge about
 * another action, or when a character inspects an item that has inscriptions (i.e., that inscribes
 * knowledge about past actions).
 *
 * Here's some detail on how this function updates the character's knowledge. First, it computes a salience
 * increment and set of associations for the relayed action, by evaluating the associated Viv expressions
 * with the character at hand bound in the evaluation context to the special `hearer` role.
 *
 * If the character does not already have a memory of the relayed action, a new memory will be created with
 * that initial salience and associations. If the character *does* already have a memory for the relayed
 * action, the running salience value will be modified by the increment derived here, and the new associations
 * will be set as the current associations, thereby removing any old associations that no longer hold. This
 * captures the phenomenon of someone reconsidering a past event in light of changes to their understanding
 * of the world (since the last time they considered the event).
 *
 * @param characterID - Entity ID for the character whose knowledge of the given relayed action will be updated.
 * @param relayingActionID - Entity ID for the action that is relaying knowledge here. If knowledge is being
 *     relayed via item inspection, this will be the entity ID for the action whose definition featured an
 *     inspection expression. If knowledge is being relayed by an action that the character is observing or
 *     hearing about, this will be the entity ID for that action.
 * @param relayedActionData - The action about which knowledge is being relayed.
 * @param evaluationContext - A Viv evaluation context with the given character bound in the special `hearer` role.
 * @param currentTimestamp - The current story-time timestamp.
 * @returns Nothing. The character's knowledge is updated via side effects.
 */
export async function processRelayedAction(
    characterID: UID,
    relayingActionID: UID,
    relayedActionData: ActionView,
    evaluationContext: EvaluationContext,
    currentTimestamp: DiegeticTimestamp
): Promise<void> {
    const salienceIncrement = await computeSalienceIncrement(
        characterID,
        relayedActionData,
        evaluationContext,
        true
    );
    const currentAssociations = await computeAssociations(
        characterID,
        relayedActionData,
        evaluationContext,
        true
    );
    // Retrieve the observer's current memory for this action, if they have one
    const updatedMemory = await GATEWAY.getCharacterMemory(characterID, relayedActionData.id);
    // If they already know of this action, update the knowledge entry
    if (updatedMemory) {
        if (!updatedMemory.sources.includes(relayingActionID)) {
            updatedMemory.sources.push(relayingActionID);
        }
        updatedMemory.salience += salienceIncrement;
        updatedMemory.salience = clampSalience(updatedMemory.salience);
        updatedMemory.associations = currentAssociations;  // Squash any earlier ones, to model reconsidering
        // Set `forgotten` to `false`, no matter what. A forgotten memory is always revitalized upon a character
        // hearing about the subject action again. If the updated salience is (still) below the forgetting
        // threshold, it will be re-forgotten upon the next fade. This is the same policy that we use
        // during initial memory formation (see `formMemories()`).
        updatedMemory.forgotten = false;
        await GATEWAY.saveCharacterMemory(characterID, relayedActionData.id, updatedMemory);
        return;
    }
    // If they are learning of this action for the first time, we will prepare a new memory
    const newMemory: CharacterMemory = {
        action: relayedActionData.id,
        formationTimestamp: currentTimestamp,
        salience: clampSalience(salienceIncrement),
        associations: currentAssociations,
        sources: [relayingActionID],
        forgotten: false  // If it's already below the forgetting threshold, it will be forgotten upon the next fade
    };
    await GATEWAY.saveCharacterMemory(characterID, relayedActionData.id, newMemory);
    // Since they're learning about this action for the first time, we'll also execute effects and trigger
    // reactions associated with the relayed action, with the observer bound to the special `hearer` role.
    await processRelatedActionForFirstTime(characterID, relayingActionID, relayedActionData, evaluationContext);
}

/**
 * Trigger effects and reactions for a character learning about a past action for the first time.
 *
 * When a character learns about a past action for the first time, we run through the action's effects
 * and reactions with this character cast in the special {@link SpecialRoleName.Hearer} role.
 *
 * Note: We only trigger effects and reactions upon the first time a character learns about an action.
 *
 * @param characterID - Entity ID for the character whose knowledge of the given relayed action will be updated.
 * @param relayingActionID - Entity ID for the action that is relaying knowledge here. If knowledge is being
 *     relayed via item inspection, this will be the entity ID for the action whose definition featured an
 *     inspection expression. If knowledge is being relayed by an action that the character is observing or
 *     hearing about, this will be the entity ID for that action.
 * @param relayedActionData - The action about which knowledge is being relayed.
 * @param evaluationContext - A Viv evaluation context with the given character bound in the special `hearer` role.
 * @returns Nothing. The character's knowledge is updated via side effects.
 */
async function processRelatedActionForFirstTime(
    characterID: UID,
    relayingActionID: UID,
    relayedActionData: ActionView,
    evaluationContext: EvaluationContext,
): Promise<void> {
    // Prepare a special post-hoc evaluation context that binds the observer of the present action
    // to the special `hearer` role in the past action. It will also include action causes to be
    // attributed to any reaction that may be triggered.
    const postHocEvaluationContext = preparePostHocEvaluationContext(
        evaluationContext,
        relayedActionData,
        characterID,
        relayingActionID
    );
    // Execute effects and trigger reactions
    const relayedActionDefinition = getActionDefinition(relayedActionData.name);
    await executeEffects(
        relayedActionDefinition,
        relayedActionData.bindings,
        postHocEvaluationContext,
        true
    );
    await triggerReactions(
        relayedActionDefinition,
        relayedActionData.bindings,
        postHocEvaluationContext,
        true
    );
}
