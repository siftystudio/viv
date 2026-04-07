/**
 * A symbol that unambiguously represents an eval fail-safe sentinel, which is a value that arises
 * when the eval fail-safe operator (`?`) follows a value that is nullish (`undefined` or `null`).
 */
export const EVAL_FAIL_SAFE_SENTINEL = Symbol("Evaluation Fail-Safe");
