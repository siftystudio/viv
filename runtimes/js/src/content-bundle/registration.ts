import semver from "semver";

import type { ContentBundle } from "./types";
import { VivValidationError, ValidationErrorSubject } from "../errors";
import { SCHEMA_VALIDATORS, getSchemaVersion, validateAgainstSchema } from "../schemas";

/**
 * The Viv compiled content bundle for the host application at hand.
 */
export let CONTENT_BUNDLE: ContentBundle;

/**
 * Plugs in the compiled content bundle for the host application at hand, making it accessible to the runtime.
 *
 * @param bundle - The Viv compiled content bundle to register.
 * @returns Nothing.
 */
export function setContentBundle(bundle: unknown): void {
    // Validate the content bundle. If this fails, an error will be thrown.
    assertContentBundle(bundle);
    assertCompatibleContentBundle(bundle);
    // If we get to here, validation succeeded, so we can set the bundle hook
    CONTENT_BUNDLE = bundle;
}

/**
 * Returns the given content bundle, assuming it matches the expected shape.
 *
 * @param bundle - The Viv compiled content bundle whose shape will be checked.
 * @returns If the shape passes, the given content bundle, cast in the proper type.
 * @throws If the given content bundle does not have the expected shape.
 */
function assertContentBundle(bundle: unknown): asserts bundle is ContentBundle {
    validateAgainstSchema<ContentBundle>(
        bundle,
        SCHEMA_VALIDATORS.contentBundle,
        ValidationErrorSubject.ContentBundle
    );
}

/**
 * Asserts that the given compiled content bundle is compatible with this runtime.
 *
 * Compatibility is enforced under semantic versioning. For pre-1.0 schema versions (where no stability
 * guarantees hold), the major and minor segments must match exactly. For post-1.0 schema versions, the
 * major segments must match and the bundle's minor segment must not exceed the runtime's.
 *
 * @param contentBundle - The content bundle whose compatibility will be checked.
 * @returns Only if the content bundle is compatible.
 * @throws {VivValidationError} If the content bundle has an invalid schema version.
 * @throws {VivValidationError} If the content bundle's schema version is incompatible with the runtime's.
 */
export function assertCompatibleContentBundle(contentBundle: ContentBundle): void {
    const runtimeVersion = getSchemaVersion();
    const bundleVersion = contentBundle.metadata.schemaVersion;
    // First, confirm that the bundle has a valid schema version
    if (!bundleVersion || !semver.valid(bundleVersion)) {
        throw new VivValidationError(
            "Incompatible content bundle",
            ValidationErrorSubject.ContentBundle,
            [`Missing or invalid schema version: '${bundleVersion}'`]
        );
    }
    // If the major versions differ, the bundle is always incompatible
    if (semver.major(bundleVersion) !== semver.major(runtimeVersion)) {
        throw new VivValidationError(
            "Incompatible content bundle",
            ValidationErrorSubject.ContentBundle,
            [
                `Bundle schema version '${bundleVersion}' is incompatible with runtime schema version `
                + `'${runtimeVersion}' (major versions must match). Make sure your Viv compiler `
                + `and runtime are compatible, and then recompile your content bundle.`
            ]
        );
    }
    // If the major version is `0`, no stability guarantees hold, so the minor versions must also match
    if (semver.major(runtimeVersion) === 0 && semver.minor(bundleVersion) !== semver.minor(runtimeVersion)) {
        throw new VivValidationError(
            "Incompatible content bundle",
            ValidationErrorSubject.ContentBundle,
            [
                `Bundle schema version '${bundleVersion}' is incompatible with runtime schema version `
                + `'${runtimeVersion}' (minor versions must match while the runtime is in 0.x). Make sure `
                + `your Viv compiler and runtime are compatible, and then recompile your content bundle.`
            ]
        );
    }
    // Otherwise, the bundle's minor version must not exceed the runtime's, since the runtime would
    // not yet support features introduced in a newer minor version of the schema
    if (semver.minor(bundleVersion) > semver.minor(runtimeVersion)) {
        throw new VivValidationError(
            "Incompatible content bundle",
            ValidationErrorSubject.ContentBundle,
            [
                `Bundle schema version '${bundleVersion}' is incompatible with runtime schema version `
                + `'${runtimeVersion}' (bundle is newer than the runtime). Upgrade your Viv runtime, `
                + `or recompile your content bundle with a compatible compiler version.`
            ]
        );
    }
}
