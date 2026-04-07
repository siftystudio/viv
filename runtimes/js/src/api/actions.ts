import type { UID } from "../adapter/types";
import type { ActionDefinition } from "../content-bundle/types";
import type { RoleBindings } from "../role-caster/types";
import type { AttemptActionArgs, AttemptActionResult, SelectActionArgs, SelectActionResult } from "./dto";
import { forciblyTargetAction, selectAction } from "../action-manager";
import { EntityType } from "../adapter";
import { validatePrecastRoleCandidates } from "../role-caster";
import { VivNotInitializedError, VivValidationError, ValidationErrorSubject } from "../errors";
import { GATEWAY } from "../gateway";
import { SCHEMA_VALIDATORS, validateAgainstSchema } from "../schemas";
import { deduplicate, getActionDefinition, isEntityOfType, isString } from "../utils";
import { vivRuntimeIsInitializedAPI } from "./init";

/**
 * Invokes the Viv action manager to carry out action selection for the given initiator, and then
 * returns the entity ID for the action that is performed as a result, if any, else `null`.
 *
 * **Important:** Calls to this function must be resolved sequentially, not concurrently (e.g.,
 * via `Promise.all`). The runtime assumes that each action is fully performed before the next
 * `selectAction` call begins, because actions mutate shared simulation state that subsequent
 * calls depend on. Concurrent calls could produce situations like a character performing a
 * physical action with another character who has already left that location. In summary:
 * action selection cannot be parallelized in Viv, at least at this time.
 *
 * @category Actions
 * @example
 * ```ts
 * // Correct: sequential await for each character
 * for (const characterID of allCharacterIDs) {
 *     await selectAction({ initiatorID: characterID });
 * }
 * ```
 * @param args - See {@link SelectActionArgs}.
 * @returns - See {@link SelectActionResult}.
 * @throws {@link VivNotInitializedError} If Viv has not been initialized.
 * @throws {@link VivInterpreterError} If the Viv interpreter encounters an issue in the course of action targeting.
 * @throws {@link VivValidationError} If the supplied `args` do not conform to the expected schema.
 * @throws {@link VivValidationError} If `initiatorID` is not an entity ID for a character.
 */
export async function selectActionAPI(args: SelectActionArgs): Promise<SelectActionResult> {
    // Confirm that Viv has been initialized
    if (!vivRuntimeIsInitializedAPI()) {
        const errorMessage = (
            `Cannot select action for initiator with entity ID '${args.initiatorID}' (Viv has not been initialized)`
        );
        throw new VivNotInitializedError(errorMessage);
    }
    // Pending the adapter configuration, structurally validate the args
    if (GATEWAY.debug?.validateAPICalls) {
        validateAgainstSchema<SelectActionArgs>(
            args,
            SCHEMA_VALIDATORS.selectActionArgs,
            ValidationErrorSubject.APICall
        );
    }
    // If `initiatorID` is present, confirm that it's an entity ID for a character
    if (args.initiatorID) {
        if (!isString(args.initiatorID) || !(await GATEWAY.isEntityID(args.initiatorID))) {
            throw new VivValidationError(
                "Cannot select action",
                ValidationErrorSubject.APICall,
                [`Entity ID '${args.initiatorID}' for initiator is not an actual entity ID`]
            );
        }
        if (!(await isEntityOfType(args.initiatorID, EntityType.Character))) {
            throw new VivValidationError(
                "Cannot select action",
                ValidationErrorSubject.APICall,
                [`Initiator with entity ID '${args.initiatorID}' is not a character`]
            );
        }
    }
    // Carry out action selection for the initiator and return the result
    return await selectAction(args.initiatorID, args.urgentOnly ?? false);
}

/**
 * Invokes the Viv action manager to force targeting of the specific given action.
 *
 * This function can be useful for debugging, and it can also support designs where a host application
 * takes a more direct role in action selection. For instance, a host application might implement a
 * lightweight drama manager that occasionally intervenes to force targeting of a particular action that
 * is narratively desirable at some point. As another example, an application might incorporate player
 * activity into the Viv action system by representing the player as a character who is cast as initiator
 * in actions that are defined in the content bundle. In the latter situation, non-player characters (NPCs)
 * would "understand" those actions for free, leading to believable reactions and, ultimately, emergent
 * storylines that weave together player and NPC activities.
 *
 * @category Actions
 * @example
 * ```ts
 * const actionID = await attemptAction({
 *     actionName: "give-gift",
 *     initiatorID: "cid-alice",
 *     precastBindings: { "giver": ["cid-alice"], "receiver": ["cid-bob"], "gift": ["chocolate"] },
 *     causes: ["aid-97", "aid-1732"],
 *     suppressConditions: true
 * });
 * if (actionID === null) {
 *     console.log("No action performed");
 * }
 * ```
 * @param args - See {@link AttemptActionArgs}.
 * @returns - See {@link AttemptActionResult}.
 * @throws {@link VivNotInitializedError} If Viv has not been initialized.
 * @throws {@link VivInterpreterError} If the Viv interpreter encounters an issue in the course of action selection.
 * @throws {@link VivValidationError} If the supplied `args` do not conform to the expected schema.
 * @throws {@link VivValidationError} If there is no defined action with the given `actionName`.
 * @throws {@link VivValidationError} If `initiatorID` is provided, but is not an entity ID for a character.
 * @throws {@link VivValidationError} If both `initiatorID` and `precastBindings` are provided, but `initiatorID`
 *     does not appear in `precastBindings` under the initiator role.
 * @throws {@link VivValidationError} If `precastBindings` is provided, and the precast bindings fail validation.
 * @throws {@link VivValidationError} If `causes` is provided, but contains something
 *     other than an entity ID for an action.
 */
export async function attemptActionAPI(args: AttemptActionArgs): Promise<AttemptActionResult> {
    // Confirm that Viv has been initialized
    if (!vivRuntimeIsInitializedAPI()) {
        const errorMessage = (
            `Cannot attempt action '${args.actionName}' (Viv has not been initialized)`
        );
        throw new VivNotInitializedError(errorMessage);
    }
    // Pending the adapter configuration, structurally validate the args
    if (GATEWAY.debug?.validateAPICalls) {
        validateAgainstSchema<AttemptActionArgs>(
            args,
            SCHEMA_VALIDATORS.attemptActionArgs,
            ValidationErrorSubject.APICall
        );
    }
    // Retrieve action definition
    let actionDefinition: ActionDefinition;
    try {
        actionDefinition = getActionDefinition(args.actionName);
    } catch {
        throw new VivValidationError(
            `Cannot attempt action '${args.actionName}'`,
            ValidationErrorSubject.APICall,
            [`Action is not defined in the registered content bundle`]
        );
    }
    // If `initiatorID` is present, confirm that it's an entity ID for a character
    let initiatorID: UID | null = null;
    if (args.initiatorID) {
        if (!isString(args.initiatorID) || !(await GATEWAY.isEntityID(args.initiatorID))) {
            throw new VivValidationError(
                `Cannot attempt action '${args.actionName}'`,
                ValidationErrorSubject.APICall,
                [`Initiator is not an entity ID: '${args.initiatorID}'`]
            );
        }
        if (!(await isEntityOfType(args.initiatorID, EntityType.Character))) {
            throw new VivValidationError(
                `Cannot attempt action '${args.actionName}'`,
                ValidationErrorSubject.APICall,
                [`Initiator is not a character: '${args.initiatorID}'`]
            );
        }
        initiatorID = args.initiatorID;
    }
    // If both `initiatorID` and `precastBindings` were provided, ensure that the initiator
    // is bound to the initiator role in the precast bindings.
    if (args.initiatorID && args.precastBindings) {
        if (!args.precastBindings[actionDefinition.initiator]?.includes(args.initiatorID)) {
            throw new VivValidationError(
                `Cannot attempt action '${args.actionName}'`,
                ValidationErrorSubject.APICall,
                [`Initiator was provided but is not cast in initiator role in the precast bindings`]
            );
        }
    }
    // If `initiatorID` is present but not `precastBindings`, prepare simple bindings for the caller
    const precastBindings: RoleBindings = args.precastBindings ?? {};
    if (args.initiatorID && !args.precastBindings) {
        precastBindings[actionDefinition.initiator] = [args.initiatorID];
    }
    // Validate the precast bindings against the associated role definitions
    const allPrecastEntityIDs = new Set<UID>();
    for (const [roleName, candidates] of Object.entries(precastBindings)) {
        if (!(roleName in actionDefinition.roles)) {
            throw new VivValidationError(
                `Cannot attempt action '${args.actionName}'`,
                ValidationErrorSubject.APICall,
                [`Precast binding references undefined role '${roleName}'`]
            );
        }
        await validatePrecastRoleCandidates(actionDefinition, roleName, candidates, allPrecastEntityIDs);
        for (const candidate of candidates) {
            if (isString(candidate)) {
                allPrecastEntityIDs.add(candidate);
            }
        }
    }
    // Deduplicate the given causes, and confirm that all of them are in fact entity IDs for actions
    const causes: UID[] = args.causes ? deduplicate<UID>(args.causes) : [];
    for (const actionID of causes) {
        if (!isString(actionID) || !(await GATEWAY.isEntityID(actionID))) {
            throw new VivValidationError(
                `Cannot attempt action '${args.actionName}'`,
                ValidationErrorSubject.APICall,
                [`Causes contains value that is not entity ID: '${actionID}'`]
            );
        }
        if (!(await isEntityOfType(actionID, EntityType.Action))) {
            throw new VivValidationError(
                `Cannot attempt action '${args.actionName}'`,
                ValidationErrorSubject.APICall,
                [`Causes contains value that is not an action: '${actionID}'`]
            );
        }
    }
    // Attempt the action and return the result
    return await forciblyTargetAction(
        actionDefinition,
        initiatorID,
        precastBindings,
        causes,
        args.suppressConditions ?? false
    );
}
