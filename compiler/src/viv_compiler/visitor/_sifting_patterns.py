"""Mixin class containing visitor methods associated with sifting-pattern definitions."""

__all__ = ["VisitorMixinSiftingPatterns"]

from typing import Any

from arpeggio import NonTerminal, PTNodeVisitor

from viv_compiler import errors, external_types, internal_types, sentinels, utils, validation
from ._roles import VisitorMixinRoles


class VisitorMixinSiftingPatterns(PTNodeVisitor):
    """A visitor mixin for Viv sifting patterns."""

    @staticmethod
    def visit_sifting_pattern(
        node: NonTerminal, children: list[Any]
    ) -> internal_types.IntermediateSiftingPatternDefinition:
        """Visit a <sifting_pattern> node."""
        # Collect all role definitions, which may be distributed across the 'roles' and 'actions' sections
        sifting_pattern_name, sifting_pattern_body = children
        all_role_definitions = []
        if "roles" in sifting_pattern_body:
            all_role_definitions += sifting_pattern_body["roles"]
        if "actions" in sifting_pattern_body:
            all_role_definitions += sifting_pattern_body["actions"]
        else:
            error_message = f"Sifting pattern '{sifting_pattern_name}' is missing 'actions' field (required)"
            raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
        validation.prevalidate_role_names(
            construct_type=external_types.ConstructDiscriminator.SIFTING_PATTERN,
            construct_name=sifting_pattern_name,
            role_definitions=all_role_definitions,
            source=utils.derive_source_annotations(node=node)
        )
        # Populate the fields that were authored
        accumulated_fields = {
            "name": sifting_pattern_name,
            "roles": {role["name"]: role for role in all_role_definitions}
        }
        for field_name, field_value in sifting_pattern_body.items():
            if field_name == "roles":
                continue  # Already handled just above
            if field_name == "actions":
                accumulated_fields["actions"] = [action['name'] for action in field_value]
            else:
                accumulated_fields[field_name] = field_value
        # Package up the intermediate definition
        intermediate_sifting_pattern_definition = internal_types.IntermediateSiftingPatternDefinition(
            type=external_types.ConstructDiscriminator.SIFTING_PATTERN,
            name=sifting_pattern_name,
            roles=accumulated_fields["roles"],
            actions=accumulated_fields["actions"],
            _conditions_raw=accumulated_fields.get("_conditions_raw", []),
        )
        return intermediate_sifting_pattern_definition

    @staticmethod
    def visit_sifting_pattern_header(
        _, children: list[external_types.SiftingPatternName]
    ) -> external_types.SiftingPatternName:
        """Visit a <sifting_pattern_header> node."""
        return children[0]

    @staticmethod
    def visit_sifting_pattern_body(_, children: list[Any]) -> dict[str, Any]:
        """Visit a <sifting_pattern_body> node."""
        accumulated_fields = {}
        for child in children:
            accumulated_fields.update(child)
        return accumulated_fields

    @staticmethod
    def visit_sifting_pattern_roles(
        _, children: list[external_types.RoleDefinition]
    ) -> dict[str, list[external_types.RoleDefinition]]:
        """Visit a <sifting_pattern_roles> node."""
        return {"roles": children}

    @staticmethod
    def visit_sifting_pattern_actions(
        _, children: list[external_types.RoleDefinition]
    ) -> dict[str, list[external_types.RoleDefinition]]:
        """Visit a <sifting_pattern_actions> node."""
        return {"actions": children}

    @staticmethod
    def visit_sifting_pattern_action(node: NonTerminal, children: list[Any]) -> external_types.RoleDefinition:
        """Visit a <sifting_pattern_action> node."""
        # The 'actions' field in a sifting pattern is just syntactic sugar for defining
        # an action role whose binding(s) will be exposed in the sifting match.
        intermediate_role_reference, body = children
        intermediate_role_reference: internal_types.IntermediateRoleReference
        action_name = intermediate_role_reference["_name"]
        if not intermediate_role_reference["_is_entity_role"]:
            error_message = f"Sifting-pattern action role is marked as a symbol (use '@' for action roles)"
            raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
        # Ensure that a casting-pool directive was provided
        if "pool" not in body:
            error_message = f"Sifting-pattern action role is missing a casting-pool directive ('is' or 'from')"
            raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
        # Build the role definition from the body fields
        role_min = body.get("min", 1)
        role_max = body.get("max", 1)
        role_definition = external_types.RoleDefinition(
            name=action_name,
            entityType=external_types.RoleEntityType.ACTION,
            min=role_min,
            max=role_max,
            parent=None,
            children=[],
            pool=body["pool"],
            chance=body.get("chance", None),
            mean=body.get("mean", None),
            sd=body.get("sd", None),
            participationMode=None,
            anywhere=True,
            precast=False,
            spawn=False,
            spawnFunction=None,
            renames=None
        )
        # Validate group-role decorator consistency (same rules as regular roles)
        if intermediate_role_reference["_is_group_role"] and role_definition['max'] < 2:
            error_message = (
                f"Sifting-pattern action role has group-role decorator but has a max < 2 "
                "(group roles must be able to cast multiple entities)"
            )
            raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
        if not intermediate_role_reference["_is_group_role"] and role_definition['max'] > 1:
            error_message = f"Sifting-pattern action role has a max > 1 but is missing group-role decorator '*'"
            raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
        return role_definition

    @staticmethod
    def visit_sifting_pattern_action_body(_, children: list[Any]) -> dict[str, Any]:
        """Visit a <sifting_pattern_action_body> node."""
        return VisitorMixinRoles.visit_role_body(_, children=children)

    @staticmethod
    def visit_sifting_pattern_conditions(
        _, children: list[list[external_types.Expression]]
    ) -> dict[str, list[external_types.Expression]]:
        """Visit a <sifting_pattern_conditions> node."""
        return {"_conditions_raw": children[0]}
