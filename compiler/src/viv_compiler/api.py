"""API for the Viv compiler."""

__all__ = ["compile_from_path"]

from pathlib import Path

from viv_compiler import config, pipeline, external_types


def compile_from_path(
    source_file_path: Path,
    *,
    default_importance: float = config.DEFAULT_IMPORTANCE_SCORE,
    default_salience: float = config.DEFAULT_SALIENCE_SCORE,
    default_reaction_priority: float = config.DEFAULT_REACTION_PRIORITY_VALUE,
    use_memoization: bool = True,
    verbose_parser: bool = False
) -> external_types.ContentBundle:
    """Compile the given Viv source file to produce a JSON-serializable compiled content bundle.

    Args:
        source_file_path: Relative or absolute path to the Viv source file to be parsed.
        default_importance: A default importance value to use when one is not specified
            in an action definition.
        default_salience: A default salience value to use when one is not specified
            in an action definition.
        default_reaction_priority: A default reaction priority to use when one is not
            specified in a reaction declaration.
        use_memoization: Whether to use memoization during PEG parsing (faster, but uses more memory).
        verbose_parser: Whether to invoke verbose debugging for the PEG parser itself.

    Returns:
        The compiled content bundle, as a JSON-serializable dictionary conforming to the `ContentBundle`
        schema. Typed definitions for the inner structures (e.g., `ActionDefinition`, `PlanDefinition`)
        are available via `viv_compiler.external_types`, for advanced use cases, but are not part of
        the stable public API.

    Raises:
        VivParseError: The source file, or a file it includes, could not be parsed.
        VivCompileError: An issue occurred during compilation, but after parsing.

    Note:
        This function is not thread-safe. Do not call it concurrently from multiple threads.
    """
    return pipeline.compile_viv_source_code(
        source_file_path=source_file_path,
        default_importance=default_importance,
        default_salience=default_salience,
        default_reaction_priority=default_reaction_priority,
        use_memoization=use_memoization,
        verbose_parser=verbose_parser,
    )
