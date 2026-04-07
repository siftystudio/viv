import type {
    GetSchemaVersionResult,
    InitializeVivRuntimeArgs,
    InitializeVivRuntimeResult,
    VivRuntimeIsInitializedResult,
} from "./dto";
import { registerVivAdapter } from "../adapter";
import { setContentBundle } from "../content-bundle";
import { getSchemaVersion } from "../schemas";

/**
 * Whether the Viv runtime has been initialized.
 */
let VIV_IS_INITIALIZED = false;

/**
 * Initializes the Viv runtime for the host application at hand by registering
 * its content bundle and Viv adapter.
 *
 * This function may be called more than once to re-initialize the runtime with a different content
 * bundle and/or adapter, with a caveat: re-initialization is only safe when the host application also
 * starts fresh, meaning the new adapter's {@link HostApplicationAdapter.getVivInternalState} returns
 * `null` and no simulation data from a prior initialization persists. If the content bundle changes
 * but old state persists (whether {@link VivInternalState} or the actual simulation data), the runtime
 * may become unstable, because components in the old state may reference action names, plan names,
 * or other definitions that do not exist in the new bundle. The actual supported use case for
 * re-initialization is a context like testing, where each initialization begins with a clean slate.
 *
 * @category Initialization
 * @example
 * ```ts
 * import { MY_COMPILED_CONTENT_BUNDLE } from "./bundle.json";
 * import { MY_ADAPTER } from "./my-adapter";
 *
 * const initialized = initializeVivRuntime({ contentBundle: MY_COMPILED_CONTENT_BUNDLE, adapter: MY_ADAPTER });
 * ```
 * @param args - See {@link InitializeVivRuntimeArgs}.
 * @returns - See {@link InitializeVivRuntimeResult}.
 * @throws If the given content bundle and adapter do not pass validation. In cases of multiple
 *     structural issues, only the first will be reported (to keep error messages manageable).
 */
export function initializeVivRuntimeAPI(args: InitializeVivRuntimeArgs): InitializeVivRuntimeResult {
    // Register the content bundle
    setContentBundle(args.contentBundle);
    // Register the Viv adapter
    registerVivAdapter(args.adapter);
    // Mark that the runtime has been initialized
    VIV_IS_INITIALIZED = true;
    // Return `true` to cue successful initialization
    return true;
}

/**
 * Returns whether the Viv runtime has been initialized successfully.
 *
 * @category Initialization
 * @example
 * ```ts
 * const vivIsInitialized = vivRuntimeIsInitialized();
 * ```
 * @returns - See {@link VivRuntimeIsInitializedResult}.
 */
export function vivRuntimeIsInitializedAPI(): VivRuntimeIsInitializedResult {
    return VIV_IS_INITIALIZED;
}

/**
 * Returns the supported Viv content-bundle schema version supported by this runtime.
 *
 * This will be a string in semver notation (e.g., `"1.0.16"`), and compatibility will be enforced
 * between this version number and the one stamped into a content bundle being registered.
 *
 * @category Initialization
 * @example
 * ```ts
 * console.log(getSchemaVersion());
 * ```
 * @returns - See {@link GetSchemaVersionResult}.
 */
export function getSchemaVersionAPI(): GetSchemaVersionResult {
    return getSchemaVersion();
}
