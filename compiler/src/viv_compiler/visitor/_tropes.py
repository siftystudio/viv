"""Mixin class containing visitor methods associated with trope definitions."""

__all__ = ["VisitorMixinTropes"]

from typing import Any

from arpeggio import NonTerminal, PTNodeVisitor

from viv_compiler import errors, external_types, internal_types, utils, validation


class VisitorMixinTropes(PTNodeVisitor):
    """A visitor mixin for Viv tropes."""

    @staticmethod
    def visit_trope(node: NonTerminal, children: list[Any]) -> internal_types.IntermediateTropeDefinition:
        """Visit a <trope> node."""
        # Populate the fields that were authored
        accumulated_fields = {}
        trope_name, trope_body = children
        if "roles" not in trope_body:
            raise errors.VivCompileError(
                f"Trope '{trope_name}' is missing 'roles' field (required)",
                source=utils.derive_source_annotations(node=node)
            )
        for field_name, field_value in trope_body.items():
            if field_name == "roles":
                validation.prevalidate_role_names(
                    construct_type=external_types.ConstructDiscriminator.TROPE,
                    construct_name=trope_name,
                    role_definitions=field_value,
                    source=utils.derive_source_annotations(node=node)
                )
                accumulated_fields["roles"] = {role["name"]: role for role in field_value}
            else:
                accumulated_fields[field_name] = field_value
        # Package up the intermediate definition
        intermediate_trope_definition = internal_types.IntermediateTropeDefinition(
            type=external_types.ConstructDiscriminator.TROPE,
            name=trope_name,
            roles=accumulated_fields["roles"],
            _conditions_raw=accumulated_fields.get("_conditions_raw", []),
        )
        return intermediate_trope_definition

    @staticmethod
    def visit_trope_header(_, children: list[external_types.TropeName]) -> external_types.TropeName:
        """Visit a <trope_header> node."""
        return children[0]

    @staticmethod
    def visit_trope_body(_, children: list[Any]) -> dict[str, Any]:
        """Visit a <trope_body> node."""
        accumulated_fields = {}
        for child in children:
            accumulated_fields.update(child)
        return accumulated_fields

    @staticmethod
    def visit_trope_roles(
        _, children: list[external_types.RoleDefinition]
    ) -> dict[str, list[external_types.RoleDefinition]]:
        """Visit a <trope_roles> node."""
        return {"roles": children}

    @staticmethod
    def visit_trope_conditions(
        _, children: list[list[external_types.Expression]]
    ) -> dict[str, list[external_types.Expression]]:
        """Visit a <trope_conditions> node."""
        return {"_conditions_raw": children[0]}
