"""Mixin class containing visitor methods associated with Viv files."""

__all__ = ["VisitorMixinFiles"]

from typing import Any

from arpeggio import NonTerminal, PTNodeVisitor

from viv_compiler import errors, external_types, internal_types, utils


class VisitorMixinFiles(PTNodeVisitor):
    """A visitor mixin for Viv files."""

    @staticmethod
    def visit_file(node: NonTerminal, children: list[Any]) -> internal_types.AST:
        """Visit the <file> node, i.e., the root of the parse tree."""
        includes: list[str] = []
        actions: list[internal_types.IntermediateActionDefinition] = []
        action_selectors: list[internal_types.IntermediateActionSelectorDefinition] = []
        plans: list[internal_types.IntermediatePlanDefinition] = []
        plan_selectors: list[internal_types.IntermediatePlanSelectorDefinition] = []
        queries: list[internal_types.IntermediateQueryDefinition] = []
        sifting_patterns: list[internal_types.IntermediateSiftingPatternDefinition] = []
        tropes: list[internal_types.IntermediateTropeDefinition] = []
        children: list[str | dict[str, Any]]
        for unit_body in children:
            if isinstance(unit_body, str):  # Include declaration
                includes.append(unit_body)
                continue
            match unit_body['type']:
                case external_types.ConstructDiscriminator.ACTION:
                    actions.append(unit_body)
                case external_types.ConstructDiscriminator.ACTION_SELECTOR:
                    action_selectors.append(unit_body)
                case external_types.ConstructDiscriminator.PLAN:
                    plans.append(unit_body)
                case external_types.ConstructDiscriminator.PLAN_SELECTOR:
                    plan_selectors.append(unit_body)
                case external_types.ConstructDiscriminator.QUERY:
                    queries.append(unit_body)
                case external_types.ConstructDiscriminator.SIFTING_PATTERN:
                    sifting_patterns.append(unit_body)
                case external_types.ConstructDiscriminator.TROPE:
                    tropes.append(unit_body)
                case _:
                    raise errors.VivCompileError(
                        f"Encountered unexpected construct type: {unit_body['type']}",
                        source=utils.derive_source_annotations(node=node)
                    )
        ast = internal_types.AST(
            _includes=includes,
            actions=actions,
            actionSelectors=action_selectors,
            plans=plans,
            planSelectors=plan_selectors,
            queries=queries,
            siftingPatterns=sifting_patterns,
            tropes=tropes
        )
        return ast

    @staticmethod
    def visit_include(_, children: list[Any]) -> str:
        """Visit an <include> node."""
        return children[0]

    @staticmethod
    def visit_file_path(_, children: list[Any]) -> str:
        """Visit a <file_path> node."""
        return ''.join(children)
