import type { GetDebuggingDataResult } from "./dto";
import { VivNotInitializedError, VivValidationError, ValidationErrorSubject } from "../errors";
import { GATEWAY } from "../gateway";
import { vivRuntimeIsInitializedAPI } from "./init";

/**
 * Returns debugging data stored in the Viv runtime's internal state.
 *
 * @category Debugging
 * @example
 * ```ts
 * await getDebuggingData();
 * ```
 * @see The supported debugging parameters on {@link HostApplicationAdapter.debug}.
 * @returns See {@link GetDebuggingDataResult}.
 * @throws {@link VivNotInitializedError} If Viv is not initialized.
 * @throws {@link VivValidationError} If the Viv runtime's internal state contains no debugging data, which occurs
 *     when the host application's Viv adapter is not configured for the collection of debugging data.
 */
export async function getDebuggingDataAPI(): Promise<GetDebuggingDataResult> {
    // Confirm that Viv has been initialized
    if (!vivRuntimeIsInitializedAPI()) {
        throw new VivNotInitializedError(`Cannot retrieve debugging data (Viv has not been initialized)`);
    }
    // Retrieve the current Viv internal state
    const vivInternalState = await GATEWAY.getVivInternalState();
    // If there is no debugging data in the internal state, throw an error
    if (vivInternalState.debugging === undefined) {
        throw new VivValidationError(
            `Cannot retrieve debugging data`,
            ValidationErrorSubject.APICall,
            ["No debugging data in the Viv runtime's internal state (is debugging enabled?)"]
        )
    }
    // Otherwise, return the debugging data
    return vivInternalState.debugging;
}
