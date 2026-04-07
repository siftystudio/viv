"""Internal functionality for validating plan definitions."""

__all__ = ["validate_plan_definitions"]

from viv_compiler import errors, external_types
from ._common import validate_common_concerns


def validate_plan_definitions(*, content_bundle: external_types.ContentBundle) -> None:
    """Validate the plan definitions in the given compiled content bundle.

    Args:
        content_bundle: A compiled content bundle.

    Returns:
        None. Only returns if no issue was detected downstream.
    """
    for plan_definition in content_bundle["plans"].values():
        # Validate general issues that pertain to all construct types
        validate_common_concerns(construct_definition=plan_definition, content_bundle=content_bundle)
        # Validate reaction windows
        _validate_plan_reaction_windows(plan_definition=plan_definition)


def _validate_plan_reaction_windows(*, plan_definition: external_types.PlanDefinition) -> None:
    """Validate the reaction windows in the given plan definition.

    Args:
        plan_definition: A plan definition from a compiled content bundle.

    Returns:
        None. Only returns if no issue was detected.

    Raises:
        VivCompileError: The plan definition has overlapping or nested reaction windows.
    """
    for phase_name, phase_definition in plan_definition['phases'].items():
        reaction_window_depth = 0
        for instruction in phase_definition['tape']:
            if instruction['type'] == external_types.PlanInstructionDiscriminator.REACTION_WINDOW_OPEN:
                reaction_window_depth += 1
                if reaction_window_depth > 1:
                    raise errors.VivCompileError(
                        f"Plan '{plan_definition['name']}' has nested/overlapping reaction windows in phase "
                        f"'{phase_name}' (reaction windows must be used sequentially, with no nesting/overlap)"
                    )
            elif instruction['type'] == external_types.PlanInstructionDiscriminator.REACTION_WINDOW_CLOSE:
                reaction_window_depth -= 1
