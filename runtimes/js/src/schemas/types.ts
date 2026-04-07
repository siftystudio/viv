import type { ValidateFunction } from 'ajv';

import type { HostApplicationAdapter } from '../adapter/types';
import type {
    AttemptActionArgs,
    QueuePlanArgs,
    RunSearchQueryArgs,
    RunSiftingPatternArgs,
    SelectActionArgs
} from '../api/dto';
import type { ContentBundle } from '../content-bundle/types';

/**
 * Schema-enforcing validators for the touch points between the Viv runtime and a host application.
 *
 * The schemas used by these validators originate in JSON that is generated from the actual
 * TypeScript types defined elsewhere in the Viv runtime code. These types also serve as the
 * source of truth for the schema used by the compiler when validating its own output.
 */
export interface SchemaValidators {
    /**
     * Validator enforcing the {@link AttemptActionArgs} shape, used to structurally validate
     * calls to {@link attemptActionAPI}.
     */
    readonly attemptActionArgs: ValidateFunction<AttemptActionArgs>;
    /**
     * Validator enforcing the {@link ContentBundle} shape, used to structurally validate
     * a content bundle upon its registration.
     */
    readonly contentBundle: ValidateFunction<ContentBundle>;
    /**
     * Validator enforcing the {@link HostApplicationAdapter} shape, used to structurally validate
     * an adapter upon its registration.
     */
    readonly hostApplicationAdapter: ValidateFunction<HostApplicationAdapter>;
    /**
     * Validator enforcing the {@link QueuePlanArgs} shape, used to structurally validate
     * calls to {@link queuePlanAPI}.
     */
    readonly queuePlanArgs: ValidateFunction<QueuePlanArgs>;
    /**
     * Validator enforcing the {@link RunSearchQueryArgs} shape, used to structurally validate
     * calls to {@link runSearchQueryAPI}.
     */
    readonly runSearchQueryArgs: ValidateFunction<RunSearchQueryArgs>;
    /**
     * Validator enforcing the {@link RunSiftingPatternArgs} shape, used to structurally validate
     * calls to {@link runSiftingPatternAPI}.
     */
    readonly runSiftingPatternArgs: ValidateFunction<RunSiftingPatternArgs>;
    /**
     * Validator enforcing the {@link SelectActionArgs} shape, used to structurally validate
     * calls to {@link selectActionAPI}.
     */
    readonly selectActionArgs: ValidateFunction<SelectActionArgs>;
}
