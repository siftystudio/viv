"""Mixin class containing visitor methods associated with reaction declarations."""

__all__ = ["VisitorMixinReactions"]

from typing import Any

from arpeggio import NonTerminal, PTNodeVisitor

from viv_compiler import config, errors, external_types, internal_types, sentinels, utils


class VisitorMixinReactions(PTNodeVisitor):
    """A visitor mixin for Viv reactions."""

    @staticmethod
    def visit_reaction(node: NonTerminal, children: list[Any]) -> external_types.Reaction:
        """Visit a <reaction> node."""
        # Populate the fields that were authored
        accumulated_fields = {}
        for child in children:
            accumulated_fields.update(child)
        if "bindings" not in accumulated_fields:
            raise errors.VivCompileError(
                "Reaction has no bindings (use 'with none;' to precast zero roles)",
                source=utils.derive_source_annotations(node=node)
            )
        # If the reaction targets an action or an action selector, prepare a default priority
        priority_default = None
        target_type = accumulated_fields['targetType']
        if target_type in (
            external_types.ConstructDiscriminator.ACTION,
            external_types.ConstructDiscriminator.ACTION_SELECTOR
        ):
            priority_default = external_types.FloatField(
                type=external_types.ExpressionDiscriminator.FLOAT,
                value=config.DEFAULT_REACTION_PRIORITY_VALUE,
                source=None
            )
        # Package up the definition
        reaction_value = external_types.Reaction(
            type=external_types.ExpressionDiscriminator.REACTION,
            value=external_types.ReactionValue(
                targetName=accumulated_fields['targetName'],
                targetType=target_type,
                bindings=accumulated_fields['bindings'],
                urgent=accumulated_fields.get('urgent', None),
                priority=accumulated_fields.get('priority', priority_default),
                location=accumulated_fields.get('location', None),
                time=accumulated_fields.get('time', None),
                repeatLogic=accumulated_fields.get('repeatLogic', None),
                abandonmentConditions=accumulated_fields.get('abandonmentConditions', None),
            ),
            source=utils.derive_source_annotations(node=node)
        )
        return reaction_value

    @staticmethod
    def visit_reaction_header(_, children: list[Any]) -> dict[str, Any]:
        """Visit a <reaction_header> node."""
        accumulated_fields = {}
        for child in children:
            accumulated_fields.update(child)
        return accumulated_fields

    @staticmethod
    def visit_reaction_target(node: NonTerminal, children: list[internal_types.Sentinel | str]) -> dict[str, Any]:
        """Visit a <reaction_target> node."""
        target_type, target_name = children
        if target_type is sentinels.REACTION_TARGET_TYPE_ACTION:
            target_type = external_types.ConstructDiscriminator.ACTION
        elif target_type is sentinels.REACTION_TARGET_TYPE_ACTION_SELECTOR:
            target_type = external_types.ConstructDiscriminator.ACTION_SELECTOR
        elif target_type is sentinels.REACTION_TARGET_TYPE_PLAN:
            target_type = external_types.ConstructDiscriminator.PLAN
        elif target_type is sentinels.REACTION_TARGET_TYPE_PLAN_SELECTOR:
            target_type = external_types.ConstructDiscriminator.PLAN_SELECTOR
        else:
            raise errors.VivCompileError(
                "Unexpected construct type for reaction target",
                source=utils.derive_source_annotations(node=node)
            )
        accumulated_fields = {
            "targetType": target_type,
            "targetName": target_name
        }
        return accumulated_fields

    @staticmethod
    def visit_reaction_target_type(node: NonTerminal, _) -> internal_types.Sentinel:
        """Visit a <reaction_target_type> node."""
        match str(node):
            case "action":
                return sentinels.REACTION_TARGET_TYPE_ACTION
            case "action-selector":
                return sentinels.REACTION_TARGET_TYPE_ACTION_SELECTOR
            case "plan":
                return sentinels.REACTION_TARGET_TYPE_PLAN
            case "plan-selector":
                return sentinels.REACTION_TARGET_TYPE_PLAN_SELECTOR
            case _:
                raise errors.VivCompileError(
                    "Unexpected construct type for reaction target",
                    source=utils.derive_source_annotations(node=node)
                )

    @staticmethod
    def visit_reaction_body(_, children: list[Any]) -> dict[str, Any]:
        """Visit a <reaction_body> node."""
        accumulated_fields = {}
        for child in children:
            accumulated_fields.update(child)
        return accumulated_fields

    @staticmethod
    def visit_reaction_urgency(_, children: list[external_types.Expression]) -> dict[str, external_types.Expression]:
        """Visit a <reaction_urgency> node."""
        return {"urgent": children[0]}

    @staticmethod
    def visit_reaction_priority(_, children: list[external_types.Expression]) -> dict[str, external_types.Expression]:
        """Visit a <reaction_priority> node."""
        return {"priority": children[0]}

    @staticmethod
    def visit_reaction_location(
        _, children: list[external_types.SetPredicate]
    ) -> dict[str, list[external_types.SetPredicate]]:
        """Visit a <reaction_location> node."""
        return {"location": children}

    @staticmethod
    def visit_reaction_time(
        _, children: list[external_types.TemporalConstraint]
    ) -> dict[str, list[external_types.TemporalConstraint]]:
        """Visit a <reaction_time> node."""
        return {"time": children}

    @staticmethod
    def visit_reaction_abandonment_conditions(
        _, children: list[list[external_types.Expression]]
    ) -> dict[str, list[external_types.Expression]]:
        """Visit a <reaction_abandonment_conditions> node."""
        return {"abandonmentConditions": children[0]}

    @staticmethod
    def visit_reaction_repeat_logic(_, children: list[Any]) -> dict[str, external_types.ReactionRepeatLogic]:
        """Visit a <reaction_repeat_logic> node."""
        accumulated_fields = {}
        for child in children:
            accumulated_fields.update(child)
        reaction_repeat_logic = external_types.ReactionRepeatLogic(
            conditions=accumulated_fields["conditions"],
            maxRepeats=accumulated_fields["maxRepeats"]
        )
        return {"repeatLogic": reaction_repeat_logic}

    @staticmethod
    def visit_reaction_repeat_logic_if(
        _, children: list[list[external_types.Expression]]
    ) -> dict[str, list[external_types.Expression]]:
        """Visit a <reaction_repeat_logic_if> node."""
        return {"conditions": children[0]}

    @staticmethod
    def visit_reaction_repeat_logic_max(_, children: list[Any]) -> dict[str, int]:
        """Visit a <reaction_repeat_logic_max> node."""
        return {"maxRepeats": int(children[0])}
