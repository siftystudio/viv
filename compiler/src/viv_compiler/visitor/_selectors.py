"""Mixin class containing visitor methods associated with selector definitions."""

__all__ = ["VisitorMixinSelectors"]

from typing import Any

from arpeggio import NonTerminal, PTNodeVisitor

from viv_compiler import errors, external_types, internal_types, sentinels, utils, validation


class VisitorMixinSelectors(PTNodeVisitor):
    """A visitor mixin for Viv action selectors and plan selectors."""

    @staticmethod
    def visit_selector(
        node: NonTerminal,
        children: list[Any]
    ) -> internal_types.IntermediateActionSelectorDefinition | internal_types.IntermediatePlanSelectorDefinition:
        """Visit a <selector> node."""
        # Populate the fields that were authored
        accumulated_fields = {}
        selector_header, selector_body = children
        accumulated_fields.update(selector_header)
        all_role_definitions = []
        if "roles" in selector_body:
            all_role_definitions += selector_body["roles"]
        validation.prevalidate_role_names(
            construct_type=accumulated_fields['type'],
            construct_name=accumulated_fields['name'],
            role_definitions=all_role_definitions,
            source=utils.derive_source_annotations(node=node)
        )
        accumulated_fields["roles"] = {role["name"]: role for role in all_role_definitions}
        for field_name, field_value in selector_body.items():
            if field_name == "roles":
                continue  # Already handled just above
            else:
                accumulated_fields[field_name] = field_value
        if "candidates" not in accumulated_fields:
            error_message = f"Selector '{accumulated_fields['name']}' is missing 'target' field (required)"
            raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
        # Package up the intermediate definition
        if accumulated_fields["type"] == external_types.ConstructDiscriminator.ACTION_SELECTOR:
            intermediate_selector_definition = internal_types.IntermediateActionSelectorDefinition(
                type=external_types.ConstructDiscriminator.ACTION_SELECTOR,
                name=accumulated_fields["name"],
                roles=accumulated_fields["roles"],
                _conditions_raw=accumulated_fields.get("_conditions_raw", []),
                reserved=accumulated_fields.get("reserved", False),
                policy=accumulated_fields["policy"],
                candidates=accumulated_fields["candidates"]
            )
        else:
            if "reserved" in accumulated_fields:
                raise errors.VivCompileError(
                    f"Plan selector '{accumulated_fields['name']}' is marked 'reserved', but this is prohibited "
                    f"(plans and plan selectors are always reserved, so the marker is not needed)",
                    source=utils.derive_source_annotations(node=node)
                )
            intermediate_selector_definition = internal_types.IntermediatePlanSelectorDefinition(
                type=external_types.ConstructDiscriminator.PLAN_SELECTOR,
                name=accumulated_fields["name"],
                roles=accumulated_fields["roles"],
                _conditions_raw=accumulated_fields.get("_conditions_raw", []),
                policy=accumulated_fields["policy"],
                candidates=accumulated_fields["candidates"]
            )
        return intermediate_selector_definition

    @staticmethod
    def visit_selector_header(_, children: list[Any]) -> dict[str, Any]:
        """Visit a <selector_header> node."""
        accumulated_fields = {}
        for child in children:
            if isinstance(child, str):
                accumulated_fields['name'] = child
            else:
                accumulated_fields.update(child)
        return accumulated_fields

    @staticmethod
    def visit_selector_type(
        _, children: list[dict[str, external_types.ConstructDiscriminator]]
    ) -> dict[str, external_types.ConstructDiscriminator]:
        """Visit a <selector_type> node."""
        return children[0]

    @staticmethod
    def visit_action_selector_type(_, __) -> dict[str, external_types.ConstructDiscriminator]:
        """Visit an <action_selector_type> node."""
        return {"type": external_types.ConstructDiscriminator.ACTION_SELECTOR}

    @staticmethod
    def visit_plan_selector_type(_, __) -> dict[str, external_types.ConstructDiscriminator]:
        """Visit a <plan_selector_type> node."""
        return {"type": external_types.ConstructDiscriminator.PLAN_SELECTOR}

    @staticmethod
    def visit_selector_body(_, children: list[Any]) -> dict[str, Any]:
        """Visit a <selector_body> node."""
        accumulated_fields = {}
        for child in children:
            accumulated_fields.update(child)
        return accumulated_fields

    @staticmethod
    def visit_selector_roles(
        _, children: list[external_types.RoleDefinition]
    ) -> dict[str, list[external_types.RoleDefinition]]:
        """Visit a <selector_roles> node."""
        return {"roles": children}

    @staticmethod
    def visit_selector_conditions(
        _, children: list[list[external_types.Expression]]
    ) -> dict[str, list[external_types.Expression]]:
        """Visit a <selector_conditions> node."""
        return {"_conditions_raw": children[0]}

    @staticmethod
    def visit_selector_target_group(
        node: NonTerminal,
        children: list[internal_types.Sentinel | list[external_types.SelectorCandidate]]
    ) -> dict[str, Any]:
        """Visit an <selector_target_group> node."""
        selector_policy_sentinel, selector_candidates = children
        match selector_policy_sentinel:
            case sentinels.SELECTOR_POLICY_RANDOM:
                selector_policy = external_types.SelectorPolicy.RANDOMIZED
            case sentinels.SELECTOR_POLICY_WEIGHTED:
                selector_policy = external_types.SelectorPolicy.WEIGHTED
            case sentinels.SELECTOR_POLICY_ORDERED:
                selector_policy = external_types.SelectorPolicy.ORDERED
            case _:
                raise errors.VivCompileError(
                    f"Unexpected selector policy",
                    source=utils.derive_source_annotations(node=node)
                )
        accumulated_fields = {
            "policy": selector_policy,
            "candidates": selector_candidates
        }
        return accumulated_fields

    @staticmethod
    def visit_selector_policy(node: NonTerminal, _) -> internal_types.Sentinel:
        """Visit an <selector_policy> node."""
        policy_string = ' '.join(str(terminal) for terminal in node)
        match policy_string:
            case "randomly":
                return sentinels.SELECTOR_POLICY_RANDOM
            case "with weights":
                return sentinels.SELECTOR_POLICY_WEIGHTED
            case "in order":
                return sentinels.SELECTOR_POLICY_ORDERED
            case _:
                raise errors.VivCompileError(
                    f"Unexpected selector policy",
                    source=utils.derive_source_annotations(node=node)
                )

    @staticmethod
    def visit_selector_candidates(
        _, children: list[external_types.SelectorCandidate]
    ) -> list[external_types.SelectorCandidate]:
        """Visit an <selector_candidates> node."""
        return children

    @staticmethod
    def visit_selector_candidate(_, children: list[Any]) -> external_types.SelectorCandidate:
        """Visit an <selector_candidate> node."""
        accumulated_fields = {}
        for child in children:
            accumulated_fields.update(child)
        selector_candidate = external_types.SelectorCandidate(
            name=accumulated_fields['name'],
            isSelector=accumulated_fields['isSelector'],
            bindings=accumulated_fields.get('bindings', external_types.PrecastBindings(partial=True, roles={})),
            weight=accumulated_fields.get('weight', None)
        )
        return selector_candidate

    @staticmethod
    def visit_selector_candidate_name(_, children: list[Any]) -> dict[str, Any]:
        """Visit an <selector_candidate_name> node."""
        accumulated_fields = {
            "name": children[-1],
            "isSelector": len(children) > 1
        }
        return accumulated_fields

    @staticmethod
    def visit_selector_candidate_weight(
        _, children: list[external_types.Expression]
    ) -> dict[str, external_types.Expression]:
        """Visit an <selector_candidate_weight> node."""
        return {"weight": children[0]}
