import type { HostApplicationAdapterConfig } from "../adapter/types";

/**
 * Default values to be used for gateway configuration parameters in cases where
 * the host application's Viv adapter does not specify values.
 */
export const GATEWAY_CONFIG_DEFAULTS: Required<HostApplicationAdapterConfig> = {
    /**
     * If changed, update `@defaultValue` tag on {@link HostApplicationAdapterConfig.loopMaxIterations}.
     */
    loopMaxIterations: 999,
    /**
     * If changed, update `@defaultValue` tag on {@link HostApplicationAdapterConfig.memoryRetentionMonthlyMultiplier}.
     */
    memoryRetentionMonthlyMultiplier: 0.9,
    /**
     * If changed, update `@defaultValue` tag on {@link HostApplicationAdapterConfig.memoryForgettingSalienceThreshold}.
     */
    memoryForgettingSalienceThreshold: 0.1,
    memoryMaxSalience: null,
};
