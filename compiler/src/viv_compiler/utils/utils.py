"""Utility functions used across the compiler modules."""

import os
from pathlib import Path
from typing import Any, Callable, Final

from arpeggio import NonTerminal, SemanticActionResults

from viv_compiler import external_types, internal_types


# A mapping from construct discriminator to a string suitable for identifying the construct type in an error message
CONSTRUCT_LABEL: Final = {
    external_types.ConstructDiscriminator.ACTION: "Action",
    external_types.ConstructDiscriminator.ACTION_SELECTOR: "Action selector",
    external_types.ConstructDiscriminator.PLAN: "Plan",
    external_types.ConstructDiscriminator.PLAN_SELECTOR: "Plan selector",
    external_types.ConstructDiscriminator.QUERY: "Query",
    external_types.ConstructDiscriminator.SIFTING_PATTERN: "Sifting pattern",
    external_types.ConstructDiscriminator.TROPE: "Trope",
}

# Parent directory of the compilation entry file
ENTRY_DIR: Path | None = None

# Absolute path to the Viv source file whose parse tree is currently being traversed by the Visitor
SOURCE_FILE_PATH: Path | None = None

# The contents of the Viv source file whose parse tree is currently being traversed by the Visitor
SOURCE_FILE_CONTENTS: str | None = None

# Handle on the Arpeggio ParserPEG method for converting a position index from the source code into line
# and column number. This comes from the parser, which uses transient data collecting during parsing.
POSITION_TO_LINE_AND_COLUMN: Callable | None = None


def register_source_file(
    *,
    source_file_path: Path,
    source_file_contents: str,
    position_to_line_and_column: Callable,
    is_entry_file: bool = False
):
    """Registers metadata about the Viv source file whose parse tree is currently being traversed.

    Args:
        source_file_path: Absolute path to the Viv source file whose parse tree is currently
            being traversed by the Visitor.
        source_file_contents: The contents of the Viv source file whose parse tree is currently
            being traversed by the Visitor.
        position_to_line_and_column: Handle on the Arpeggio ParserPEG method for converting
            a position index from the source code into line and column number. This comes from
            the parser, which uses transient data collecting during parsing.
        is_entry_file: Whether this is the compilation entry file (as opposed to an included file).
    """
    global ENTRY_DIR, SOURCE_FILE_PATH, SOURCE_FILE_CONTENTS, POSITION_TO_LINE_AND_COLUMN
    if is_entry_file:
        ENTRY_DIR = source_file_path.parent
    SOURCE_FILE_PATH = source_file_path
    SOURCE_FILE_CONTENTS = source_file_contents
    POSITION_TO_LINE_AND_COLUMN = position_to_line_and_column


def derive_source_annotations(*, node: NonTerminal) -> external_types.SourceAnnotations:
    """Return source annotations derived for the given expression AST node.

    Args:
        node: The AST node for which source annotations will be derived.

    Returns:
        Source annotations derived for the given expression AST node.

    Raises:
        RuntimeError: The source file has not yet been registered. This is only caused by a
            fundamental compiler issue, which should never occur for an end user.
    """
    if not (SOURCE_FILE_PATH and SOURCE_FILE_CONTENTS and POSITION_TO_LINE_AND_COLUMN):
        raise RuntimeError("Source file must be registered prior to deriving source annotations")
    start_line_number, start_column_number = POSITION_TO_LINE_AND_COLUMN(node.position)
    end_line_number, end_column_number = POSITION_TO_LINE_AND_COLUMN(node.position_end)
    code = SOURCE_FILE_CONTENTS[node.position:node.position_end]
    source_annotations = external_types.SourceAnnotations(
        filePath=os.path.relpath(SOURCE_FILE_PATH, ENTRY_DIR),
        line=start_line_number,
        column=start_column_number,
        endLine=end_line_number,
        endColumn=end_column_number,
        code=code.rstrip()  # Strip trailing whitespace
    )
    return source_annotations


def get_entry_dir() -> Path:
    """Return the parent directory of the compilation entry file.

    Raises:
        RuntimeError: The entry file has not yet been registered.
    """
    if ENTRY_DIR is None:
        raise RuntimeError("Attempt to retrieve the compilation entry directory prior to it being registered")
    return ENTRY_DIR


def sanitize_ast(*, ast: Any) -> Any:
    """Returns a deep copy of the given AST with all (nested) Arpeggio containers replaced with plain lists.

    Args:
        ast: An AST produced by our visitor.

    Returns:
        A deep copy of the given AST with all (nested) Arpeggio containers replaced with plain lists.
    """
    if isinstance(ast, SemanticActionResults):
        return [sanitize_ast(ast=value) for value in ast]
    if isinstance(ast, dict):
        return {key: sanitize_ast(ast=value) for key, value in ast.items()}
    if isinstance(ast, list):
        return [sanitize_ast(ast=value) for value in ast]
    if isinstance(ast, tuple):  # We'll be serializing to JSON soon enough, so let's convert to a list right now
        return [sanitize_ast(ast=value) for value in ast]
    return ast


def get_all_construct_definitions(
    *, combined_ast: internal_types.CombinedAST
) -> list[internal_types.IntermediateConstructDefinition]:
    """Returns a list containing all intermediate construct definitions in the given combined AST.

    Args:
        combined_ast: A combined AST at any point in the postprocessing pipeline.

    Returns:
        A list containing all construct definitions in the given combined AST.
    """
    all_construct_definitions = (
        combined_ast['actions'] +
        combined_ast['actionSelectors'] +
        combined_ast['plans'] +
        combined_ast['planSelectors'] +
        combined_ast['queries'] +
        combined_ast['siftingPatterns'] +
        combined_ast['tropes']
    )
    return all_construct_definitions


def get_all_referenced_roles(*, ast_chunk: Any) -> list[external_types.RoleName]:
    """Return a deduplicated list of all roles referenced in the given AST chunk.

    Note: Order must be preserved here.

    Args:
        ast_chunk: The full or partial AST to search for role references.

    Returns:
        A list containing the names of all roles referenced in the given AST chunk.
    """
    reference_discriminators = (
        external_types.ExpressionDiscriminator.ENTITY_REFERENCE,
        external_types.ExpressionDiscriminator.SYMBOL_REFERENCE
    )
    roles_referenced_so_far: list[external_types.RoleName] = []
    if isinstance(ast_chunk, list):
        for element in ast_chunk:
            roles_referenced_so_far.extend(get_all_referenced_roles(ast_chunk=element))
    elif isinstance(ast_chunk, dict):
        ast_chunk_type = ast_chunk.get('type')
        if ast_chunk_type in reference_discriminators:
            if not ast_chunk['value']['local']:
                roles_referenced_so_far.append(ast_chunk['value']['anchor'])
        for value in ast_chunk.values():
            roles_referenced_so_far.extend(get_all_referenced_roles(ast_chunk=value))
    return sorted(set(roles_referenced_so_far))


def get_all_expressions_of_type(
    *,
    expression_type: external_types.ExpressionDiscriminator,
    ast_chunk: Any
) -> list[external_types.Expression]:
    """Return a list containing all the Viv expressions of the given type in the given AST chunk.

    Args:
        expression_type: String indicating the type of Viv expression to search for.
        ast_chunk: The AST chunk to search for expressions of the given type.

    Returns:
        A list containing all the Viv expressions of the given type in the given AST chunk.
    """
    expressions = []
    if isinstance(ast_chunk, list):
        for element in ast_chunk:
            expressions.extend(get_all_expressions_of_type(expression_type=expression_type, ast_chunk=element))
    elif isinstance(ast_chunk, dict):
        if 'type' in ast_chunk and ast_chunk['type'] == expression_type:
            expressions.append(ast_chunk)
        for _key, value in ast_chunk.items():  # No `else` here, because we want to recurse into the expression value
            expressions.extend(get_all_expressions_of_type(expression_type=expression_type, ast_chunk=value))
    return expressions


def is_initiator_role(*, role_definition: external_types.RoleDefinition) -> bool:
    """Return whether the given role is an initiator role.

    Args:
        role_definition: Definition for the role in question.

    Returns:
        Whether the given role is an initiator role.
    """
    return role_definition["participationMode"] == external_types.RoleParticipationMode.INITIATOR
