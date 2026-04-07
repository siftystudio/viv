import type { UID } from "../adapter/types";
import type { PlanDefinition } from "../content-bundle/types";
import type { RoleBindings } from "../role-caster/types";
import type { QueuePlanArgs, QueuePlanResult } from "./dto";
import { EntityType } from "../adapter";
import { VivNotInitializedError, VivValidationError, ValidationErrorSubject } from "../errors";
import { GATEWAY } from "../gateway";
import { tickPlanner } from "../planner";
import { forciblyQueuePlan } from "../queue-manager";
import { SCHEMA_VALIDATORS, validateAgainstSchema } from "../schemas";
import { deduplicate, getPlanDefinition, isEntityOfType, isString } from "../utils";
import { vivRuntimeIsInitializedAPI } from "./init";

/**
 * Invokes the Viv planner to force queueing of the specific given plan.
 *
 * This function can be useful for debugging, and it can also support designs where a host application
 * takes a more direct role in narrative control. For instance, a host application might implement
 * something like a drama manager that decides to orchestrate high-level logic around actions that
 * should be pursued. For instance, the drama manager could decide that a particular character should
 * begin to pursue some course of action that is captured in a plan, which can be precipitated by passing
 * that plan along here. Of course, plans can always be selected in the course of normal Viv operation,
 * but it can be also be useful to force plan queueing to assert more fine-grained control.
 *
 * @category Planning
 * @example
 * ```ts
 * const planID = await queuePlan({
 *     planName: "move-to-big-city",
 *     urgent: true,
 *     precastBindings: { "mover": ["cid-alice"], "city": ["cid-nyc"] },
 *     causes: ["aid-824"]
 * });
 * console.log(`Queued plan with UID '${planID}'`);
 * ```
 * @param args - See {@link QueuePlanArgs}.
 * @returns - See {@link QueuePlanResult}.
 * @throws {@link VivNotInitializedError} If Viv is not initialized.
 * @throws {@link VivInterpreterError} If the Viv interpreter encounters an issue in the course of plan queueing.
 * @throws {@link VivValidationError} If the supplied `args` do not conform to the expected schema.
 * @throws {@link VivValidationError} If there is no defined plan with the given `planName`.
 * @throws {@link VivValidationError} If `causes` is provided, but contains something
 *     other than an entity ID for an action.
 */
export async function queuePlanAPI(args: QueuePlanArgs): Promise<QueuePlanResult> {
    // Confirm that Viv has been initialized
    if (!vivRuntimeIsInitializedAPI()) {
        throw new VivNotInitializedError(`Cannot queue plan '${args.planName}' (Viv has not been initialized)`);
    }
    // Pending the adapter configuration, structurally validate the args
    if (GATEWAY.debug?.validateAPICalls) {
        validateAgainstSchema<QueuePlanArgs>(
            args,
            SCHEMA_VALIDATORS.queuePlanArgs,
            ValidationErrorSubject.APICall
        );
    }
    // Retrieve plan definition
    let planDefinition: PlanDefinition;
    try {
        planDefinition = getPlanDefinition(args.planName);
    } catch {
        throw new VivValidationError(
            `Cannot queue plan '${args.planName}'`,
            ValidationErrorSubject.APICall,
            ["Plan is not defined in the registered content bundle"]
        );
    }
    // Prepare precast bindings, if none were provided
    const precastBindings: RoleBindings = args.precastBindings ?? {};
    // Deduplicate the given causes, and confirm that all of them are in fact entity IDs for actions
    const causes: UID[] = args.causes ? deduplicate<UID>(args.causes) : [];
    for (const actionID of causes) {
        if (!isString(actionID) || !(await GATEWAY.isEntityID(actionID))) {
            throw new VivValidationError(
                `Cannot queue plan '${args.planName}'`,
                ValidationErrorSubject.APICall,
                [`Causes contains value that is not entity ID: '${actionID}'`]
            );
        }
        if (!(await isEntityOfType(actionID, EntityType.Action))) {
            throw new VivValidationError(
                `Cannot queue plan '${args.planName}'`,
                ValidationErrorSubject.APICall,
                [`Causes contains value that is not action: '${actionID}'`]
            );
        }
    }
    // Queue the plan and return its UID
    return await forciblyQueuePlan(
        planDefinition,
        precastBindings,
        args.urgent ?? false,
        causes
    );
}

/**
 * Ticks the Viv planner, causing it to do the following work:
 *  - Target each queued plan and queued plan selector in the global plan queue (in the {@link VivInternalState}).
 *    If a plan is successfully targeted, it will be launched and then immediately greedily executed to the degree
 *    possible, up to potential resolution. In the course of such initial execution, other plans may be queued,
 *    but only ones queued via `urgent` reactions will be immediately targeted upon being queued. If such an
 *    urgently queued plan is successfully targeted right away, it will itself be immediately launched with
 *    initial greedy execution, which may cause additional urgent queueing, and so forth.
 *  - Resume execution of all other plans that were already active at the beginning of the tick.
 *
 * @category Planning
 * @example
 * ```ts
 * await tickPlanner();
 * ```
 * @returns Nothing. All changes are persisted via side effects.
 * @throws {@link VivNotInitializedError} If Viv has not been initialized.
 * @throws {@link VivInterpreterError} If the Viv interpreter encounters an issue in the course of plan execution.
 */
export async function tickPlannerAPI(): Promise<void> {
    // Confirm that Viv has been initialized
    if (!vivRuntimeIsInitializedAPI()) {
        throw new VivNotInitializedError(`Cannot tick planner`);
    }
    // Tick the planner
    return await tickPlanner();
}
