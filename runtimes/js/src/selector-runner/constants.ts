/**
 * Enum containing the valid selector policies.
 */
export enum SelectorPolicy {
    /**
     * Target the candidates in the author-specified order.
     */
    Ordered = "ordered",
    /**
     * Target the candidates in random order.
     */
    Randomized = "randomized",
    /**
     * Target the candidates in weighted random order.
     */
    Weighted = "weighted"
}
