"""API for the Viv compiler."""

__all__ = ["compile_from_path", "compile_from_string"]

from pathlib import Path

from viv_compiler import config, errors, pipeline, external_types


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
    resolved_source_file_path = Path(source_file_path).expanduser().resolve()
    try:
        with open(resolved_source_file_path, encoding="utf-8") as source_file:
            source_code = source_file.read()
    except IsADirectoryError:
        raise errors.VivCompileError(f"Expected a file, but got a directory: {resolved_source_file_path}") from None
    except FileNotFoundError:
        raise errors.VivCompileError(f"Source file not found: {resolved_source_file_path}") from None
    return pipeline.compile_viv_source_code(
        source_code=source_code,
        source_file_path=resolved_source_file_path,
        default_importance=default_importance,
        default_salience=default_salience,
        default_reaction_priority=default_reaction_priority,
        use_memoization=use_memoization,
        verbose_parser=verbose_parser,
    )


def compile_from_string(
    source_code: str,
    *,
    entry_dir: Path | None = None,
    default_importance: float = config.DEFAULT_IMPORTANCE_SCORE,
    default_salience: float = config.DEFAULT_SALIENCE_SCORE,
    default_reaction_priority: float = config.DEFAULT_REACTION_PRIORITY_VALUE,
    use_memoization: bool = True,
    verbose_parser: bool = False
) -> external_types.ContentBundle:
    """Compile Viv source code from a string.

    This is an alternative to `compile_from_path`, the default compiler entrypoint,
    that accepts source code directly in lieu of a file path.

    Args:
        source_code: A string containing (only) the Viv source code to compile.
        entry_dir: Relative or absolute path to a directory that will be used as the parent directory
            of the proxy entry file. This allows any includes in the source code to be handled, since
            the include paths are always relative to the file being compiled. This defaults to the
            current working directory, and can be ignored if `source_code` has no includes.
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
        VivParseError: The source code, or a file it includes, could not be parsed.
        VivCompileError: An issue occurred during compilation, but after parsing.

    Note:
        This function is not thread-safe. Do not call it concurrently from multiple threads.
    """
    resolved_entry_dir = (entry_dir or Path.cwd()).resolve()
    return pipeline.compile_viv_source_code(
        source_code=source_code,
        source_file_path=resolved_entry_dir / "<string>",
        default_importance=default_importance,
        default_salience=default_salience,
        default_reaction_priority=default_reaction_priority,
        use_memoization=use_memoization,
        verbose_parser=verbose_parser,
    )
