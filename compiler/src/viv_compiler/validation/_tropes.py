"""Internal functionality for validating trope definitions."""

__all__ = ["validate_trope_definitions"]

from viv_compiler import external_types
from ._common import validate_common_concerns


def validate_trope_definitions(*, content_bundle: external_types.ContentBundle) -> None:
    """Validate the trope definitions in the given compiled content bundle.

    Args:
        content_bundle: A compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.
    """
    for trope_definition in content_bundle["tropes"].values():
        # Validate general issues that pertain to all construct types
        validate_common_concerns(construct_definition=trope_definition, content_bundle=content_bundle)
