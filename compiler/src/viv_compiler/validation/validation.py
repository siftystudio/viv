"""Handles validation of the compiled content bundle."""

__all__ = ["validate_content_bundle"]

from viv_compiler import external_types
from ._actions import validate_action_definitions
from ._plans import validate_plan_definitions
from ._queries import validate_query_definitions
from ._selectors import validate_action_selector_definitions, validate_plan_selector_definitions
from ._sifting_patterns import validate_sifting_pattern_definitions
from ._tropes import validate_trope_definitions


def validate_content_bundle(*, content_bundle: external_types.ContentBundle) -> None:
    """Validate the given compiled content bundle.

    Args:
        content_bundle: The compiled content bundle to validate.

    Returns:
        None. Only returns if no issue was detected downstream.
    """
    # Validate action definitions
    validate_action_definitions(content_bundle=content_bundle)
    # Validate action-selector definitions
    validate_action_selector_definitions(content_bundle=content_bundle)
    # Validate plan definitions
    validate_plan_definitions(content_bundle=content_bundle)
    # Validate plan-selector definitions
    validate_plan_selector_definitions(content_bundle=content_bundle)
    # Validate query definitions
    validate_query_definitions(content_bundle=content_bundle)
    # Validate sifting-pattern definitions
    validate_sifting_pattern_definitions(content_bundle=content_bundle)
    # Validate trope definitions
    validate_trope_definitions(content_bundle=content_bundle)
