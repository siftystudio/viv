"""Handles importing between Viv files."""

__all__ = ["integrate_included_files"]

from pathlib import Path

import arpeggio
from arpeggio.cleanpeg import ParserPEG

from viv_compiler import errors, internal_types, utils, validation, visitor


def integrate_included_files(
    *,
    viv_parser: ParserPEG,
    viv_visitor: visitor.Visitor,
    ast: internal_types.AST,
    entry_point_file_path: Path,
) -> internal_types.CombinedAST:
    """Handle any `include` declarations in the given AST (including any recursive ones)
    and return a dictionary containing trope definitions and action definitions.

    Args:
        viv_parser: A prepared Viv parser.
        viv_visitor: A prepared Viv AST visitor.
        ast: An abstract syntax tree produced by the Visitor class.
        entry_point_file_path: The file path for the file that is being directly compiled by the author.

    Returns:
        A combined AST containing content compiled from the entry-point file along
        with that of any included files.
    """
    # First, we need to recursively gather all included files. If we do this step first, we don't
    # need to worry about circular dependencies (Viv allows circular imports).
    all_included_asts: list[internal_types.AST] = [ast]
    _parse_all_included_files(
        viv_parser=viv_parser,
        viv_visitor=viv_visitor,
        ast=ast,
        anchor_dir=entry_point_file_path.parent,
        included_file_paths={entry_point_file_path},
        included_file_asts=all_included_asts
    )
    # We'll start with the AST for the user's entry file. If there's no includes,
    # will end up being the combined AST.
    combined_ast = internal_types.CombinedAST(
        actions=[],
        actionSelectors=[],
        plans=[],
        planSelectors=[],
        queries=[],
        siftingPatterns=[],
        tropes=[]
    )
    # Now let's parse each of the included files to build up a combined AST
    for included_ast in all_included_asts:
        _integrate_included_file(combined_ast=combined_ast, included_file_ast=included_ast)
    # Ensure that we do not have any duplicate names (either within a file or across files)
    validation.prevalidate_construct_names(combined_ast=combined_ast)
    # Return the combined AST
    return combined_ast


def _parse_all_included_files(
    *,
    viv_parser: ParserPEG,
    viv_visitor: visitor.Visitor,
    ast: internal_types.AST,
    anchor_dir: Path,
    included_file_paths: set[Path],
    included_file_asts: list[internal_types.AST]
) -> None:
    """Parse all the files included in the one at hand, and so forth recursively.

    Critically, this method is robust to circular includes, however arcane, and it captures
    arbitrarily recursive includes.

    Args:
        viv_parser: A prepared Viv parser.
        viv_visitor: A prepared Viv AST visitor.
        ast: An abstract syntax tree produced by the Visitor class.
        anchor_dir: The directory from which relative include paths will be resolved.
        included_file_paths: A running set containing absolute paths for all included
            files parsed so far. This will be mutated in place.
        included_file_asts: A running list containing ASTs for all included files parsed
            so far. This will also be mutated in place.

    Returns:
        Nothing. Mutates both `included_file_paths` and `included_file_asts` in place.

    Raises:
        VivCompileError: An included file does not exist.
        VivParseError: An included file could not be parsed.
    """
    for included_file_relative_path in ast["_includes"]:
        included_file_absolute_path = (anchor_dir / included_file_relative_path).resolve()
        if included_file_absolute_path in included_file_paths:  # Already captured this one
            continue
        included_file_paths.add(included_file_absolute_path)
        try:
            included_file_contents = included_file_absolute_path.read_text(encoding="utf-8")
        except FileNotFoundError:
            error_message = f"Bad 'include' declaration (file not found): {included_file_relative_path}"
            raise errors.VivCompileError(error_message)
        utils.register_source_file(
            source_file_path=included_file_absolute_path,
            source_file_contents=included_file_contents,
            position_to_line_and_column=viv_parser.pos_to_linecol
        )
        try:
            included_file_parse_tree = viv_parser.parse(_input=included_file_contents)
        except arpeggio.NoMatch as parsing_error:
            raise errors.VivParseError(original=parsing_error, file_path=included_file_absolute_path) from None
        included_file_ast: internal_types.AST = utils.sanitize_ast(
            ast=arpeggio.visit_parse_tree(parse_tree=included_file_parse_tree, visitor=viv_visitor)
        )
        included_file_asts.append(included_file_ast)
        _parse_all_included_files(
            viv_parser=viv_parser,
            viv_visitor=viv_visitor,
            ast=included_file_ast,
            anchor_dir=included_file_absolute_path.parent,
            included_file_paths=included_file_paths,
            included_file_asts=included_file_asts
        )


def _integrate_included_file(
    *,
    combined_ast: internal_types.CombinedAST,
    included_file_ast: internal_types.AST
) -> None:
    """Integrate into the given combined AST the constructs in the given AST for an included file.

    Args:
        combined_ast: The combined AST that is currently being constructed.
        included_file_ast: AST for the file whose constructs will be integrated into the combined AST.

    Returns:
        Nothing. The combined AST is mutated in place.
    """
    combined_ast["actions"] += included_file_ast["actions"]
    combined_ast["actionSelectors"] += included_file_ast["actionSelectors"]
    combined_ast["plans"] += included_file_ast["plans"]
    combined_ast["planSelectors"] += included_file_ast["planSelectors"]
    combined_ast["queries"] += included_file_ast["queries"]
    combined_ast["siftingPatterns"] += included_file_ast["siftingPatterns"]
    combined_ast["tropes"] += included_file_ast["tropes"]
