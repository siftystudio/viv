import type { TemporalConstraint, TimeOfDayStatement } from "../dsl/types";
import { TemporalStatementDiscriminator } from "../dsl";

/**
 * Returns whether the given temporal statement is a time-of-day statement specifically.
 *
 * @param temporalStatement - The Viv temporal statement in question.
 * @returns Whether the given temporal statement is a time-of-day statement specifically.
 */
export function isTimeOfDayStatement(
    temporalStatement: TemporalConstraint
): temporalStatement is TimeOfDayStatement {
    return temporalStatement.type === TemporalStatementDiscriminator.TimeOfDay;
}
