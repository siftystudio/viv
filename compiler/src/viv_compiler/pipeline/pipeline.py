"""Core pipeline orchestrator for the Viv compiler."""

__all__ = ["compile_viv_source_code"]

from pathlib import Path
from importlib.resources import files

import arpeggio
from arpeggio.cleanpeg import ParserPEG

from viv_compiler import (
    bundler,
    config,
    errors,
    external_types,
    includes,
    internal_types,
    postprocessing,
    utils,
    validation,
    visitor
)


def compile_viv_source_code(
    *,
    source_file_path: Path,
    default_importance: float,
    default_salience: float,
    default_reaction_priority: float,
    use_memoization: bool,
    verbose_parser: bool = False,
) -> external_types.ContentBundle:
    """Compile the given Viv source file to produce a JSON-serializable compiled content bundle.

    Args:
        source_file_path: The absolute path to the Viv source file to be parsed.
        default_importance: A default importance value to use when one is not specified
            in an action definition.
        default_salience: A default salience value to use when one is not specified
            in an action definition.
        default_reaction_priority: A default reaction priority to use when one is not
            specified in a reaction declaration.
        use_memoization: Whether to use memoization during PEG parsing (faster, but uses more memory).
        verbose_parser: Whether to engage a verbose debugging mode for the PEG parser itself (default: `False`).

    Returns:
        The compiled content bundle.

    Raises:
        VivParseError: The source file could not be parsed.
    """
    # Honor user-supplied config parameters, or the associated default values if none were supplied
    _honor_user_supplied_config_parameters(
        default_importance=default_importance,
        default_salience=default_salience,
        default_reaction_priority=default_reaction_priority,
    )
    # Create a Viv parser
    viv_parser = _create_viv_parser(use_memoization=use_memoization, verbose=verbose_parser)
    # Load the source file to be compiled
    source_file_contents = _load_source_file(source_file_path=source_file_path)
    # Parse the source file to produce a parse tree
    try:
        parse_tree = viv_parser.parse(_input=source_file_contents)
    except arpeggio.NoMatch as parsing_error:
        raise errors.VivParseError(original=parsing_error, file_path=source_file_path) from None
    # Following the visitor pattern in parsing, traverse the parse tree to gradually
    # construct an abstract syntax tree (AST).
    viv_visitor = visitor.Visitor()
    utils.register_source_file(
        source_file_path=source_file_path,
        source_file_contents=source_file_contents,
        position_to_line_and_column=viv_parser.pos_to_linecol,
        is_entry_file=True
    )
    ast: internal_types.AST = utils.sanitize_ast(
        ast=arpeggio.visit_parse_tree(parse_tree=parse_tree, visitor=viv_visitor)
    )
    # If there are any include declarations (i.e., import statements), honor those now
    combined_ast: internal_types.CombinedAST = includes.integrate_included_files(
        viv_parser=viv_parser,
        viv_visitor=viv_visitor,
        ast=ast,
        entry_point_file_path=source_file_path
    )
    # Conduct postprocessing on the combined AST (modifies it in place)
    postprocessing.postprocess_combined_ast(combined_ast=combined_ast)
    # Package up the compiled content bundle
    compiled_content_bundle = bundler.create_compiled_content_bundle(combined_ast=combined_ast)
    # Conduct final validation and, if it passes, return the validated content bundle. If an issue
    # is detected, an exception will be raised instead.
    validation.validate_content_bundle(content_bundle=compiled_content_bundle)
    return compiled_content_bundle


def _honor_user_supplied_config_parameters(
    *,
    default_importance: float,
    default_salience: float,
    default_reaction_priority: float,
) -> None:
    """Updates the global Viv compiler config to honor any user-supplied parameters.

    Args:
        default_importance: A user-provided default importance value to use when one is not specified in
            an action definition. The CLI provides a default value if the user does not supply one.
        default_salience: A user-provided default salience value to use when one is not specified in
            an action definition. The CLI provides a default value if the user does not supply one.
        default_reaction_priority: A user-provided default reaction priority to use when one is not
            specified in a reaction declaration queueing an action or an action selector.

    Returns:
        Nothing. Mutates the config in place.
    """
    config.DEFAULT_IMPORTANCE_SCORE = default_importance
    config.DEFAULT_SALIENCE_SCORE = default_salience
    config.DEFAULT_REACTION_PRIORITY_VALUE = default_reaction_priority


def _create_viv_parser(*, use_memoization: bool, verbose: bool) -> ParserPEG:
    """Return a PEG parser initialized for the Viv DSL, with user-defined settings.

    Args:
        use_memoization: Whether to use memoization during PEG parsing (faster, but uses more memory).
        verbose: Whether to engage a verbose debugging mode for the PEG parser itself.

    Returns:
        A PEG parser initialized for the Viv DSL.
    """
    # Load the Viv DSL grammar
    viv_grammar = files("viv_compiler.grammar").joinpath("viv.peg").read_text(encoding="utf-8")
    # Prepare and return the parser
    viv_parser = ParserPEG(
        language_def=viv_grammar,
        root_rule_name=config.GRAMMAR_ROOT_SYMBOL,
        comment_rule_name=config.GRAMMAR_COMMENT_SYMBOL,
        reduce_tree=False,
        ws="\t\n\r ",
        memoization=use_memoization,
        debug=verbose
    )
    return viv_parser


def _load_source_file(*, source_file_path: Path) -> str:
    """Return the contents of the Viv source file at the given path.

    Args:
        source_file_path: Path to the Viv source file to be compiled.

    Returns:
        Contents of the Viv source file at the given path.
    """
    try:
        with open(source_file_path, encoding="utf-8") as source_file:
            return source_file.read()
    except IsADirectoryError:
        raise errors.VivCompileError(f"Expected a file, but got a directory: {source_file_path}") from None
    except FileNotFoundError:
        raise errors.VivCompileError(f"Source file not found: {source_file_path}") from None
