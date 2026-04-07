import type { UID } from "../adapter/types";
import type { ConstructDefinition, RoleDefinition, RoleName } from "../content-bundle/types";
import type { PrecastBindings } from "../dsl/types";
import type { EvaluationContext } from "../interpreter/types";
import type { RoleBindings, RoleCandidate } from "./types";
import { EntityType } from "../adapter";
import { RoleEntityType } from "../content-bundle";
import { GATEWAY } from "../gateway";
import { VivInternalError, VivRoleCastingError } from "../errors";
import { dehydrateExpressionValue, EVAL_FAIL_SAFE_SENTINEL, interpretExpression } from "../interpreter";
import { isArray, isArrayOf, isString } from "../utils";
import {
    isConstructWithInitiatorRole,
    isRoleCandidate,
    isSiftingPatternActionRole,
    isSymbolRoleBinding
} from "./utils";

/**
 * Returns validated precast bindings for the given construct.
 *
 * @param constructDefinition - The construct for which precast bindings are being constructed.
 * @param rawPrecastBindings - An object containing Viv expressions that, once evaluated,
 *     will result in precast bindings for the given construct.
 * @param context - A Viv evaluation context.
 * @returns Evaluated precast bindings for the given construct.
 * @throws {VivRoleCastingError} If an undefined role is precast.
 * @throws {VivRoleCastingError} If an invalid value is precast.
 * @throws {VivRoleCastingError} If an initiator is not precast for a construct requiring one.
 */
export async function precastRoles(
    constructDefinition: ConstructDefinition,
    rawPrecastBindings: PrecastBindings,
    context: EvaluationContext
): Promise<RoleBindings> {
    const precastBindings: RoleBindings = {};
    const allPrecastEntityIDs = new Set<UID>();
    for (const [roleName, precastCandidatesExpression] of Object.entries(rawPrecastBindings.roles)) {
        // While the compiler enforces that only defined roles are referenced in precast bindings,
        // it's possible for the content bundle to change after an action has been queued, so let's
        // confirm that this role is still defined.
        if (!(roleName in constructDefinition.roles)) {
            throw new VivRoleCastingError(
                "Bad precast bindings: role was precast but is not defined in construct",
                constructDefinition,
                roleName
            );
        }
        // Evaluate and dehydrate the candidate(s) precast for this role
        let evaluatedCandidatePool = await interpretExpression(precastCandidatesExpression, context);
        evaluatedCandidatePool = await dehydrateExpressionValue(evaluatedCandidatePool);
        // Handle any case of the eval fail-safe sentinel
        if (evaluatedCandidatePool === EVAL_FAIL_SAFE_SENTINEL) {
            evaluatedCandidatePool = [];
        } else if (isArray(evaluatedCandidatePool)) {
            evaluatedCandidatePool = evaluatedCandidatePool.filter(
                candidate => candidate !== EVAL_FAIL_SAFE_SENTINEL
            );
        }
        // If the evaluation is a single candidate (most likely), convert it into a singleton array. Viv
        // authors are free to specify bindings using various notations: `@foo: @bar`, `@foo: *buzz`,
        // and also `@foo: @a, @b, @c`, the latter of which is converted into a single Viv list
        // expression. In any event, we need to handle both singleton and group cases here.
        const candidatesPrecastForRole: unknown[] = (
            isArray(evaluatedCandidatePool) ? evaluatedCandidatePool : [evaluatedCandidatePool]
        );
        // Confirm the result contains only proper role candidates
        if (!isArrayOf<RoleCandidate>(candidatesPrecastForRole, isRoleCandidate)) {
            throw new VivRoleCastingError(
                "Bad precast bindings: precast candidate is not valid role candidate",
                constructDefinition,
                roleName,
                { candidatesPrecastForRole }
            );
        }
        // Validate the precast candidates for this role
        await validatePrecastRoleCandidates(
            constructDefinition,
            roleName,
            candidatesPrecastForRole,
            allPrecastEntityIDs
        );
        // If they evaluated to an empty array, and no error was thrown during validation, skip this role. If the
        // role is required and the bindings are marked complete, we would have thrown an error during validation.
        // Likewise if role carries the `precast` label, and thus can only be filled via precasting.
        if (!candidatesPrecastForRole.length) {
            continue;
        }
        // Otherwise, we can safely incorporate this role's precast bindings
        precastBindings[roleName] ??= [];
        precastBindings[roleName].push(...candidatesPrecastForRole);
        if (constructDefinition.roles[roleName].entityType !== RoleEntityType.Symbol) {
            // We won't add any sifting pattern `actions` roles here, because they are not beholden
            // to the constraint that an entity cannot be cast in multiple roles, and moreover they
            // do not prevent `roles` action roles from casting the same actions. See the long note
            // at `candidateIsBoundToOtherRole()` for an explanation as to why.
            if (!isSiftingPatternActionRole(roleName, constructDefinition)) {
                candidatesPrecastForRole.forEach(entityID => allPrecastEntityIDs.add(entityID as UID));
            }
        }
    }
    // If the target construct is of a type that uses an initiator role, ensure that the initiator role is precast
    if (isConstructWithInitiatorRole(constructDefinition)) {
        if (!(constructDefinition.initiator in precastBindings)) {
            throw new VivRoleCastingError(
                "Bad precast bindings: initiator role not precast",
                constructDefinition,
                constructDefinition.initiator,
                { precastBindings }
            );
        }
    }
    // If the bindings are marked complete, ensure they are indeed complete
    if (!rawPrecastBindings.partial) {
        validateCompletePrecastBindings(constructDefinition, precastBindings);
    }
    // Finally, return the evaluated and validated precast bindings
    return precastBindings;
}

/**
 * Validates the given precast candidates for the given role.
 *
 * @param constructDefinition - Definition for the construct with which the given role is associated.
 * @param roleName - Name of the role with which the given precast candidates are associated.
 * @param candidatesPrecastForRole - The candidates precast for the given role.
 * @param allPrecastEntityIDs - Array containing entity IDs for all entities that have already been precast.
 * @returns Nothing, but only if validation passes.
 * @throws {VivRoleCastingError} If too many candidates are precast in a role.
 * @throws {VivRoleCastingError} If too few candidates are precast in a 'precast' role.
 * @throws {VivRoleCastingError} If a symbol candidate does not have a valid symbol type.
 * @throws {VivRoleCastingError} If an entity candidate does not have the right entity type.
 * @throws {VivRoleCastingError} If an entity is precast multiple times.
 */
export async function validatePrecastRoleCandidates(
    constructDefinition: ConstructDefinition,
    roleName: RoleName,
    candidatesPrecastForRole: unknown[],
    allPrecastEntityIDs: Set<UID>
): Promise<void> {
    const roleDefinition = constructDefinition.roles[roleName];
    if (candidatesPrecastForRole.length > roleDefinition.max) {
        throw new VivRoleCastingError(
            "Bad precast bindings: too many candidates in role",
            constructDefinition,
            roleName,
            { candidatesPrecastForRole, roleMax: roleDefinition.max }
        );
    }
    if (roleDefinition.precast && candidatesPrecastForRole.length < roleDefinition.min) {
        // This is an error because a 'precast' role can only be filled via precasting
        throw new VivRoleCastingError(
            "Bad precast bindings: too few candidates in role marked 'precast'",
            constructDefinition,
            roleName,
            { candidatesPrecastForRole, roleMin: roleDefinition.min }
        );
    }
    if (roleDefinition.entityType === RoleEntityType.Symbol) {
        for (const candidate of candidatesPrecastForRole) {
            if (!isSymbolRoleBinding(candidate)) {
                throw new VivRoleCastingError(
                    "Bad precast bindings: invalid candidate for symbol role",
                    constructDefinition,
                    roleName,
                    { candidate }
                );
            }
        }
    } else {
        const precastEntityIDs = new Set<UID>();
        for (const candidate of candidatesPrecastForRole) {
            if (!isString(candidate) || !(await GATEWAY.isEntityID(candidate))) {
                throw new VivRoleCastingError(
                    "Bad precast bindings: non-entity in entity role",
                    constructDefinition,
                    roleName,
                    { candidate }
                );
            }
            if (!(await candidateEntityFitsRoleType(candidate, roleDefinition))) {
                throw new VivRoleCastingError(
                    "Bad precast bindings: candidate has wrong entity type for role",
                    constructDefinition,
                    roleName,
                    { candidate }
                );
            }
            if (precastEntityIDs.has(candidate)) {
                throw new VivRoleCastingError(
                    "Bad precast bindings: candidate appears multiple times in role",
                    constructDefinition,
                    roleName,
                    { candidate }
                );
            }
            if (allPrecastEntityIDs.has(candidate)) {
                // As explained in `candidateIsBoundToOtherRole()`, the `actions` roles in
                // sifting patterns are exempt from this constraint.
                if (!isSiftingPatternActionRole(roleName, constructDefinition)) {
                    throw new VivRoleCastingError(
                        "Bad precast bindings: candidate appears in multiple roles",
                        constructDefinition,
                        roleName,
                        { candidate }
                    );
                }
            }
            precastEntityIDs.add(candidate);
        }
    }
}

/**
 * Returns whether the given entity fits the type specified by the given role's labels.
 *
 * @param candidateEntityID - Entity ID for a candidate for the given role.
 * @param roleDefinition - Definition for the role in question.
 *     is associated, needed to throw an error.
 * @returns Whether the given entity fits the type specified by the given role's labels.
 * @throws {VivInternalError} If the role definition is malformed (defensive guard).
 */
export async function candidateEntityFitsRoleType(
    candidateEntityID: UID,
    roleDefinition: RoleDefinition
): Promise<boolean> {
    if (roleDefinition.entityType === RoleEntityType.Symbol) {
        return false;
    }
    const entityType = await GATEWAY.getEntityType(candidateEntityID);
    switch (roleDefinition.entityType) {
        case RoleEntityType.Action:
            return entityType === EntityType.Action;
        case RoleEntityType.Character:
            return entityType === EntityType.Character;
        case RoleEntityType.Item:
            return entityType === EntityType.Item;
        case RoleEntityType.Location:
            return entityType === EntityType.Location;
        default:
            throw new VivInternalError("Invalid role entity type");
    }
}

/**
 * Throws an error if the given precast bindings, which have been marked complete, are in fact incomplete.
 *
 * @param constructDefinition - Definition for the construct with which the given role is associated.
 * @param precastBindings - Final precast bindings for the given construct, which an author has marked complete.
 * @returns Nothing, but only if validation passes.
 * @throws {VivRoleCastingError} If the bindings are marked complete but fail to precast all required role slots.
 */
export function validateCompletePrecastBindings(
    constructDefinition: ConstructDefinition,
    precastBindings: RoleBindings
): void {
    for (const [roleName, roleDefinition] of Object.entries(constructDefinition.roles)) {
        if (roleDefinition.min === 0) {
            continue;
        }
        if (!(roleName in precastBindings)) {
            throw new VivRoleCastingError(
                "Bad precast bindings: bindings marked complete but do not precast required role",
                constructDefinition,
                roleName,
                { precastBindings }
            );
        }
        if (precastBindings[roleName].length < roleDefinition.min) {
            throw new VivRoleCastingError(
                "Bad precast bindings: bindings marked complete but precast too few candidates for role",
                constructDefinition,
                roleName,
                { precastBindings, roleMin: roleDefinition.min }
            );
        }
    }
}
