/**
 * @packageDocumentation
 *
 * The Viv custom error classes.
 *
 * Here's our error hierarchy:
 *
 * VivError
 * ├── VivExecutionError
 * │   ├── VivInterpreterError
 * │   ├── VivRoleCastingError
 * ├── VivValidationError
 * ├── VivNotInitializedError
 * └── VivInternalError
 */

export * from "./constants";
export * from "./errors";
