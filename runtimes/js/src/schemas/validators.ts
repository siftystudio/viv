import type { ErrorObject, ValidateFunction } from "ajv";
import Ajv from "ajv";

import type {
    AttemptActionArgs,
    QueuePlanArgs,
    RunSearchQueryArgs,
    RunSiftingPatternArgs,
    SelectActionArgs
} from "../api/dto";
import type { ContentBundle } from "../content-bundle/types";
import type { HostApplicationAdapter } from "../adapter/types";
import type { SchemaValidators } from "./types";
import type { ValidationErrorSubject } from "../errors";
import { VivInternalError, VivValidationError } from "../errors";
import apiSchema from "./api.schema.json";
import contentBundleSchema from "./content-bundle.schema.json";

/**
 * Name for the content-bundle schema, as registered with Ajv.
 */
const CONTENT_BUNDLE_SCHEMA_NAME = "content-bundle";

/**
 * Name for the runtime API schema, as registered with Ajv.
 */
const API_SCHEMA_NAME = "api";

/**
 * A singleton Ajv instance, initialized with our special `isFunction` keyword
 * and loaded up with our runtime schema.
 *
 * A few notes:
 *
 *  - The `"version"` keyword whitelists our custom top-level `version` field in the schema,
 *    which stores the version of the content-bundle schema itself, which Ajv's strict mode
 *    would otherwise reject as an unknown keyword.
 *
 *  - Our custom `isFunction` keyword is required because there is no native support in
 *    JSON Schema for representing function types. When we generate the content-bundle
 *    schema, we postprocess the output to mark all function types in this manner.
 */
const ajv = new Ajv({ strict: true, allowUnionTypes: true, allErrors: false })  // One error at a time
    .addKeyword("version")
    .addKeyword({
        keyword: "isFunction",
        validate: (_schema: boolean, data: unknown) => typeof data === "function",
        errors: false,
    })
    .addSchema(contentBundleSchema, CONTENT_BUNDLE_SCHEMA_NAME)
    .addSchema(apiSchema, API_SCHEMA_NAME);

/**
 * Initialized schema-enforcing validators for the touch points between
 * the Viv runtime and a host application.
 */
export const SCHEMA_VALIDATORS: SchemaValidators = {
    attemptActionArgs: getValidator<AttemptActionArgs>("AttemptActionArgs", API_SCHEMA_NAME),
    contentBundle: getValidator<ContentBundle>("ContentBundle", CONTENT_BUNDLE_SCHEMA_NAME),
    hostApplicationAdapter: getValidator<HostApplicationAdapter>("HostApplicationAdapter", API_SCHEMA_NAME),
    queuePlanArgs: getValidator<QueuePlanArgs>("QueuePlanArgs", API_SCHEMA_NAME),
    runSearchQueryArgs: getValidator<RunSearchQueryArgs>("RunSearchQueryArgs", API_SCHEMA_NAME),
    runSiftingPatternArgs: getValidator<RunSiftingPatternArgs>("RunSiftingPatternArgs", API_SCHEMA_NAME),
    selectActionArgs: getValidator<SelectActionArgs>("SelectActionArgs", API_SCHEMA_NAME),
} as const;

/**
 * Returns a structural validator for the schema component with the given key.
 *
 * @typeParam T - The type associated with the given schema component.
 * @param key - The schema key associated with the schema component for which a validator will be prepared.
 * @param schemaName - The name of the schema for which a validator is to be furnished.
 * @returns A prepared validator.
 * @throws {VivInternalError} If the schema is missing (defensive guard).
 */
function getValidator<T>(key: string, schemaName: string): ValidateFunction<T> {
    const validator = ajv.getSchema(`${schemaName}#/definitions/${key}`);
    if (!validator) {
        throw new VivInternalError(`Schema not found: ${key}`);
    }
    return validator as ValidateFunction<T>;
}

/**
 * Structurally validates the given data using the given validator, throwing an error if there is any issue.
 *
 * @typeParam T - The shape against which the given data will be validated, associated with the given validator.
 * @param data - The data to validate.
 * @param validator - The validator to use on the data.
 * @param subject - The {@link ValidationErrorSubject} at hand.
 * @returns If the data passes validation.
 * @throws If the data does not pass validation.
 */
export function validateAgainstSchema<T>(
    data: unknown,
    validator: typeof SCHEMA_VALIDATORS[keyof typeof SCHEMA_VALIDATORS],
    subject: ValidationErrorSubject
): asserts data is T {
    if (!validator(data)) {
        const formattedErrors = formatAjvErrors(validator.errors ?? []);
        throw new VivValidationError(`Validation failed for ${subject}`, subject, formattedErrors);
    }
}

/**
 * Returns an array containing human-readable validation error strings from Ajv error objects.
 *
 * @param errors - Validation errors reported by Ajv.
 * @returns An array of formatted error strings.
 */
function formatAjvErrors(errors: ErrorObject[]): string[] {
    return errors.map(error => {
        const path = error.instancePath || '/';
        if (error.keyword === 'additionalProperties') {
            return `${path}: unexpected property '${error.params.additionalProperty}'`;
        }
        return `${path}: ${error.message}`;
    });
}
