"""Internal functionality for validating sifting-pattern definitions."""

__all__ = ["validate_sifting_pattern_definitions"]

from viv_compiler import external_types
from ._common import validate_common_concerns


def validate_sifting_pattern_definitions(*, content_bundle: external_types.ContentBundle) -> None:
    """Validate the sifting-pattern definitions in the given compiled content bundle.

    Args:
        content_bundle: A compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.
    """
    for sifting_pattern_definition in content_bundle["siftingPatterns"].values():
        # Validate general issues that pertain to all construct types
        validate_common_concerns(construct_definition=sifting_pattern_definition, content_bundle=content_bundle)
