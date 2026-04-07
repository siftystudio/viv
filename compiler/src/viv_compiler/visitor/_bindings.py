"""Mixin class containing visitor methods associated with precast bindings."""

__all__ = ["VisitorMixinBindings"]

from typing import Any

from arpeggio import NonTerminal, PTNodeVisitor

from viv_compiler import config, errors, external_types, internal_types, utils


class VisitorMixinBindings(PTNodeVisitor):
    """A visitor mixin for Viv precast bindings."""

    @staticmethod
    def visit_bindings(_, children: list[Any]) -> dict[str, external_types.PrecastBindings]:
        """Visit a <bindings> node."""
        return {"bindings": children[0]}

    @staticmethod
    def visit_bindings_none(_, __) -> external_types.PrecastBindings:
        """Visit a <bindings_none> node."""
        precast_bindings = external_types.PrecastBindings(partial=True, roles={})
        return precast_bindings

    @staticmethod
    def visit_bindings_partial(
        node: NonTerminal,
        children: list[tuple[external_types.RoleName, external_types.Expression]]
    ) -> external_types.PrecastBindings:
        """Visit a <bindings_partial> node."""
        precast_bindings = external_types.PrecastBindings(
            partial=True,
            roles=VisitorMixinBindings._collect_bindings(node=node, bindings=children)
        )
        return precast_bindings

    @staticmethod
    def visit_bindings_complete(node: NonTerminal, children: list[Any]) -> external_types.PrecastBindings:
        """Visit a <bindings_complete> node."""
        precast_bindings = external_types.PrecastBindings(
            partial=False,
            roles=VisitorMixinBindings._collect_bindings(node=node, bindings=children)
        )
        return precast_bindings

    @staticmethod
    def visit_bindings_sugared(_, children: list[Any]) -> dict[str, external_types.PrecastBindings]:
        """Visit a <bindings_sugared> node."""
        return {"bindings": children[0]}

    @staticmethod
    def visit_bindings_sugared_none(_, __) -> external_types.PrecastBindings:
        """Visit a <bindings_sugared_none> node."""
        return external_types.PrecastBindings(partial=True, roles={})

    @staticmethod
    def visit_bindings_sugared_partial(node: NonTerminal, children: list[Any]) -> external_types.PrecastBindings:
        """Visit a <bindings_sugared_partial> node."""
        precast_bindings = external_types.PrecastBindings(
            partial=True,
            roles=VisitorMixinBindings._collect_bindings(node=node, bindings=children[0])
        )
        return precast_bindings

    @staticmethod
    def visit_bindings_sugared_complete(node: NonTerminal, children: list[Any]) -> external_types.PrecastBindings:
        """Visit a <bindings_sugared_complete> node."""
        precast_bindings = external_types.PrecastBindings(
            partial=False,
            roles=VisitorMixinBindings._collect_bindings(node=node, bindings=children[0])
        )
        return precast_bindings

    @staticmethod
    def visit_bindings_sugared_actual_bindings(_, children: list[Any]) -> list[dict[str, Any]]:
        """Visit a <bindings_sugared_actual_bindings> node."""
        return children

    @staticmethod
    def _collect_bindings(
        *,
        node: NonTerminal,
        bindings: list[tuple[external_types.RoleName | None, external_types.Expression]]
    ) -> dict[external_types.RoleName, external_types.Expression]:
        """Prepare the 'roles' field of a precast bindings."""
        roles: dict[external_types.RoleName, external_types.Expression] = {}
        for i, (role_name, expression) in enumerate(bindings):
            if role_name is None:  # Positional binding
                role_name = f"{config.POSITIONAL_BINDING_TRANSIENT_PREFIX}{i}"
            if role_name in roles:
                error_message = (
                    f"Duplicate role detected in precast bindings (use comma separation to "
                    f"precast multiple slots): '{role_name}'"
                )
                raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
            roles[role_name] = expression
        return roles

    @staticmethod
    def visit_binding(
        _, children: list[internal_types.IntermediateRoleReference, external_types.Expression]
    ) -> tuple[external_types.RoleName, external_types.Expression]:
        """Visit a <binding> node."""
        role_reference, expression = children
        role_reference: internal_types.IntermediateRoleReference
        expression: external_types.Expression
        binding = (role_reference["_name"], expression)
        return binding

    @staticmethod
    def visit_positional_binding(
        _, children: list[external_types.Expression]
    ) -> tuple[None, external_types.Expression]:
        """Visit a <positional_binding> node."""
        positional_binding = (None, children[0])
        return positional_binding
