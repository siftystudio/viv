import type { DiegeticTimestamp, UID } from "../adapter/types";
import type { ActionName } from "../content-bundle/types";
import type { RoleBindings } from "../role-caster/types";

/**
 * An active embargo that has been asserted in the running simulation instance of the host application.
 *
 * @category Other
 */
export interface ActiveEmbargo {
    /**
     * A unique identifier for the embargo, provisioned by Viv.
     */
    readonly id: string;
    /**
     * The name of the action associated with this embargo.
     */
    readonly actionName: ActionName;
    /**
     * If applicable, the entity ID for the location associated with this embargo.
     */
    readonly location: UID | null;
    /**
     * The timestamp at which the embargo will be lifted, otherwise `null` for a permanent embargo.
     */
    readonly expiration: DiegeticTimestamp | null;
    /**
     * A mapping from a role name to an array of entity IDs for entities who the embargo prohibits
     * from being cast in that role again (assuming the other embargo constraints hold). If the
     * embargo places no such constraints, this field will be set to `null`.
     */
    readonly bindings: RoleBindings | null;
}
