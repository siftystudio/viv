/**
 * @packageDocumentation
 *
 * Module exposing a handle on the Viv adapter for the host application at hand, which the
 * latter can set (e.g., during initialization) using a helper function exposed here.
 *
 * A Viv adapter must be provided by the Viv host application to the Viv runtime so that it
 * can do things like read entity data to evaluate Viv expressions.
 */

export * from "./constants";
export * from "./registration";
