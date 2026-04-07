"""Mixin class containing visitor methods associated with Viv statements."""

__all__ = ["VisitorMixinStatements"]

from typing import Any

from arpeggio import NonTerminal, PTNodeVisitor

from viv_compiler import external_types, sentinels, utils


class VisitorMixinStatements(PTNodeVisitor):
    """A visitor mixin for Viv statements."""

    @staticmethod
    def visit_statements(_, children: list[external_types.Expression]) -> list[external_types.Expression]:
        """Visit a <statements> node."""
        return children

    @staticmethod
    def visit_scoped_statements(_, children: list[external_types.Expression]) -> list[external_types.Expression]:
        """Visit a <scoped_statements> node."""
        return children

    @staticmethod
    def visit_statement(_, children: list[external_types.Expression]) -> external_types.Expression:
        """Visit a <statement> node."""
        return children[0]

    @staticmethod
    def visit_conditional(node: NonTerminal, children: list[Any]) -> external_types.Conditional:
        """Visit a <conditional> node."""
        if len(children) > 1:
            branches, alternative = children
        else:
            branches, alternative = children[0], None
        conditional = external_types.Conditional(
            type=external_types.ExpressionDiscriminator.CONDITIONAL,
            value=external_types.ConditionalValue(branches=branches, alternative=alternative),
            source=utils.derive_source_annotations(node=node)
        )
        return conditional

    @staticmethod
    def visit_conditional_branches(
        _, children: list[external_types.ConditionalBranch]
    ) -> list[external_types.ConditionalBranch]:
        """Visit a <conditional_branches> node."""
        return children

    @staticmethod
    def visit_conditional_branch(_, children: list[Any]) -> external_types.ConditionalBranch:
        """Visit a <conditional_branch> node."""
        condition, consequent = children
        conditional_branch = external_types.ConditionalBranch(condition=condition, consequent=consequent)
        return conditional_branch

    @staticmethod
    def visit_condition(_, children: list[external_types.Expression]) -> external_types.Expression:
        """Visit a <condition> node."""
        return children[0]

    @staticmethod
    def visit_consequent(_, children: list[list[external_types.Expression]]) -> list[external_types.Expression]:
        """Visit a <consequent> node."""
        return children[0]

    @staticmethod
    def visit_alternative(_, children: list[list[external_types.Expression]]) -> list[external_types.Expression]:
        """Visit an <alternative> node."""
        return children[0]

    @staticmethod
    def visit_loop(node: NonTerminal, children: list[Any]) -> external_types.Loop:
        """Visit a <loop> node."""
        iterable_reference, loop_variable, loop_body = children
        loop = external_types.Loop(
            type=external_types.ExpressionDiscriminator.LOOP,
            value=external_types.LoopValue(iterable=iterable_reference, variable=loop_variable, body=loop_body),
            source=utils.derive_source_annotations(node=node)
        )
        return loop

    @staticmethod
    def visit_local_variable(_, children: list[Any]) -> external_types.LocalVariable:
        """Visit a <local_variable> node."""
        _sigil, binding_type, name = children
        local_variable = external_types.LocalVariable(
            name=name,
            isEntityVariable=binding_type is sentinels.ENTITY_BINDING_TYPE
        )
        return local_variable
