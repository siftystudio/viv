import contentBundleSchema from "./content-bundle.schema.json";

/**
 * The current Viv content-bundle schema version supported by this runtime.
 */
const SCHEMA_VERSION: string = contentBundleSchema.version;

/**
 * Returns the supported Viv content-bundle schema version supported by this runtime.
 *
 * This will be a string in semver notation, and compatibility will be enforced between this
 * version number and the one stamped into a content bundle being registered -- a check that
 * occurs in {@link assertCompatibleContentBundle}.
 *
 * @returns The supported Viv content-bundle schema version supported by this runtime,
 *     which is a string in semver notation (e.g. `"1.0.16"`).
 */
export function getSchemaVersion(): string {
    return SCHEMA_VERSION;
}
