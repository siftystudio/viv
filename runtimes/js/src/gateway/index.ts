/**
 * @packageDocumentation
 *
 * Module exposing a gateway to the host application's Viv adapter.
 *
 * The Viv runtime uses the adapter gateway to make use of functionality implemented via the target
 * application's Viv adapter. The gateway directly exposes adapter functionality, and also implements
 * certain operations in the most optimized fashion available, given the adapter's supply of optional
 * fast-path functions.
 */

export * from "./gateway";
