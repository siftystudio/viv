"""Mixin class containing visitor methods associated with Viv temporal constraints."""

__all__ = ["VisitorMixinTemporalConstraints"]

from typing import cast

from arpeggio import NonTerminal, PTNodeVisitor

from viv_compiler import errors, external_types, internal_types, sentinels, utils


class VisitorMixinTemporalConstraints(PTNodeVisitor):
    """A visitor mixin for temporal constraints."""

    @staticmethod
    def visit_temporal_constraint(
        _, children: list[external_types.TemporalConstraint]
    ) -> external_types.TemporalConstraint:
        """Visit a <temporal_constraint> node."""
        return children[0]

    @staticmethod
    def visit_time_frame_statement(
        _, children: list[external_types.TimeFrameStatement]
    ) -> external_types.TimeFrameStatement:
        """Visit a <time_frame_statement> node."""
        return children[0]

    @staticmethod
    def visit_time_frame_statement_before(
        _, children: list[external_types.TimeDelta | internal_types.Sentinel | None]
    ) -> external_types.TimeFrameStatement:
        """Visit a <time_frame_statement_before> node."""
        frame_close, frame_anchor = children
        frame_close: external_types.TimeDelta
        frame_anchor: internal_types.Sentinel | None
        time_frame_statement = external_types.TimeFrameStatement(
            type=external_types.TemporalStatementDiscriminator.TIME_FRAME,
            open=None,
            close=frame_close,
            useActionTimestamp=frame_anchor is sentinels.ACTION_TEMPORAL_ANCHOR
        )
        return time_frame_statement

    @staticmethod
    def visit_time_frame_statement_after(
        _, children: list[external_types.TimeDelta | internal_types.Sentinel | None]
    ) -> external_types.TimeFrameStatement:
        """Visit a <time_frame_statement_after> node."""
        frame_open, frame_anchor = children
        frame_open: external_types.TimeDelta
        frame_anchor: internal_types.Sentinel | None
        time_frame_statement = external_types.TimeFrameStatement(
            type=external_types.TemporalStatementDiscriminator.TIME_FRAME,
            open=frame_open,
            close=None,
            useActionTimestamp=frame_anchor is sentinels.ACTION_TEMPORAL_ANCHOR
        )
        return time_frame_statement

    @staticmethod
    def visit_time_frame_statement_between(
        _, children: list[external_types.TimeDelta | internal_types.Sentinel | None]
    ) -> external_types.TimeFrameStatement:
        """Visit a <time_frame_statement_between> node."""
        frame_open, frame_close, frame_anchor = children
        frame_open: external_types.TimeDelta
        frame_close: external_types.TimeDelta
        frame_anchor: internal_types.Sentinel | None
        time_frame_statement = external_types.TimeFrameStatement(
            type=external_types.TemporalStatementDiscriminator.TIME_FRAME,
            open=frame_open,
            close=frame_close,
            useActionTimestamp=frame_anchor is sentinels.ACTION_TEMPORAL_ANCHOR
        )
        return time_frame_statement

    @staticmethod
    def visit_time_period(
        _, children: list[external_types.FloatField | external_types.IntField | external_types.TimeFrameTimeUnit]
    ) -> external_types.TimeDelta:
        """Visit a <time_period> node."""
        number_expression, time_unit = children
        number_expression: external_types.FloatField | external_types.IntField
        time_unit: external_types.TimeFrameTimeUnit
        number = number_expression['value']
        time_delta = external_types.TimeDelta(amount=number, unit=time_unit)
        return time_delta

    @staticmethod
    def visit_time_unit(node: NonTerminal, children: list[str]) -> external_types.TimeFrameTimeUnit:
        """Visit a <time_unit> node."""
        raw_time_unit = children[0]
        match raw_time_unit:
            case "minutes" | "hours" | "days" | "weeks" | "months" | "years":
                time_unit = raw_time_unit
            case "minute" | "hour" | "day" | "week" | "month" | "year":
                time_unit = raw_time_unit + 's'
            case _:
                raise errors.VivCompileError(
                    f"Unexpected time unit: {raw_time_unit}",
                    source=utils.derive_source_annotations(node=node)
                )
        return cast(external_types.TimeFrameTimeUnit, time_unit)

    @staticmethod
    def visit_time_frame_anchor(_, children: list[internal_types.Sentinel]) -> internal_types.Sentinel:
        """Visit a <time_frame_anchor> node."""
        return children[0]

    @staticmethod
    def visit_time_frame_anchor_from_action(_, __) -> internal_types.Sentinel:
        """Visit a <time_frame_anchor_from_action> node."""
        return sentinels.ACTION_TEMPORAL_ANCHOR

    @staticmethod
    def visit_time_frame_anchor_from_hearing(_, __) -> internal_types.Sentinel:
        """Visit a <time_frame_anchor_from_hearing> node."""
        return sentinels.NON_ACTION_TEMPORAL_ANCHOR

    @staticmethod
    def visit_time_frame_anchor_from_now(_, __) -> internal_types.Sentinel:
        """Visit a <time_frame_anchor_from_now> node."""
        return sentinels.NON_ACTION_TEMPORAL_ANCHOR

    @staticmethod
    def visit_time_frame_anchor_ago(_, __) -> internal_types.Sentinel:
        """Visit a <time_frame_anchor_ago> node."""
        return sentinels.NON_ACTION_TEMPORAL_ANCHOR

    @staticmethod
    def visit_time_of_day_statement(
        _, children: list[external_types.TimeOfDayStatement]
    ) -> external_types.TimeOfDayStatement:
        """Visit a <time_of_day_statement> node."""
        return children[0]

    @staticmethod
    def visit_time_of_day_statement_before(
        _, children: list[external_types.TimeOfDayDeclaration]
    ) -> external_types.TimeOfDayStatement:
        """Visit a <time_of_day_statement_before> node."""
        window_close = children[0]
        time_of_day_statement = external_types.TimeOfDayStatement(
            type=external_types.TemporalStatementDiscriminator.TIME_OF_DAY,
            open=None,
            close=window_close
        )
        return time_of_day_statement

    @staticmethod
    def visit_time_of_day_statement_after(
        _, children: list[external_types.TimeOfDayDeclaration]
    ) -> external_types.TimeOfDayStatement:
        """Visit a <time_of_day_statement_after> node."""
        window_open = children[0]
        time_of_day_statement = external_types.TimeOfDayStatement(
            type=external_types.TemporalStatementDiscriminator.TIME_OF_DAY,
            open=window_open,
            close=None
        )
        return time_of_day_statement

    @staticmethod
    def visit_time_of_day_statement_between(
        _, children: list[external_types.TimeOfDayDeclaration]
    ) -> external_types.TimeOfDayStatement:
        """Visit a <time_of_day_statement_between> node."""
        window_open, window_close = children
        time_of_day_statement = external_types.TimeOfDayStatement(
            type=external_types.TemporalStatementDiscriminator.TIME_OF_DAY,
            open=window_open,
            close=window_close
        )
        return time_of_day_statement

    @staticmethod
    def visit_time_of_day(node: NonTerminal, children: list[str]) -> external_types.TimeOfDayDeclaration:
        """Visit a <time_of_day> node."""
        raw_hour = int(children[0])
        twelve_hour_form = children[-1] in ("am", "pm")
        if twelve_hour_form:
            period = children[-1]
            minute = int(children[1]) if len(children) > 2 else 0
            if not 1 <= raw_hour <= 12:
                raise errors.VivCompileError(
                    f"Invalid hour in 12-hour time: {raw_hour}",
                    source=utils.derive_source_annotations(node=node)
                )
            hour = (raw_hour % 12) + (12 if period == "pm" else 0)
        else:
            minute = int(children[1]) if len(children) > 1 else 0
            if not 0 <= raw_hour <= 23:
                raise errors.VivCompileError(
                    f"Invalid hour in 24-hour time: {raw_hour}",
                    source=utils.derive_source_annotations(node=node)
                )
            hour = raw_hour
        if not 0 <= minute <= 59:
            raise errors.VivCompileError(f"Invalid minute in time: {minute}", source=utils.derive_source_annotations(node=node))
        return external_types.TimeOfDayDeclaration(hour=hour, minute=minute)

    @staticmethod
    def visit_time_of_day_hh(node: NonTerminal, _) -> str:
        """Visit a <time_of_day_hh> node."""
        return str(node)

    @staticmethod
    def visit_time_of_day_mm(node: NonTerminal, _) -> str:
        """Visit a <time_of_day_mm> node."""
        return str(node)
