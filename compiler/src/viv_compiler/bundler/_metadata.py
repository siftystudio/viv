"""Handles the creation of metadata to include in a compiled content bundle."""

__all__ = ["create_metadata"]

from typing import Any

from viv_compiler import __version__, __schema_version__, __grammar_version__, external_types, internal_types, utils


def create_metadata(*, combined_ast: internal_types.CombinedAST) -> external_types.ContentBundleMetadata:
    """Return a package containing metadata for a compiled content bundle, derived from the given combined AST.

    Args:
        combined_ast: A combined AST that has undergone all postprocessing.

    Returns:
        A metadata package for a compiled content bundle, derived from the given combined AST.
    """
    # Compile all referenced enums
    referenced_enum_names = _get_all_referenced_enum_names(ast_chunk=combined_ast)
    # Compile all referenced custom functions
    referenced_custom_function_names = _get_all_referenced_custom_function_names(ast_chunk=combined_ast)
    # Compile all reactions constrained by time of day
    time_of_day_parameterized_reactions = _get_time_of_day_parameterized_reactions(combined_ast=combined_ast)
    # Compile all queries referencing time of day
    time_of_day_parameterized_queries = _get_time_of_day_parameterized_queries(combined_ast=combined_ast)
    # Determine whether there is at least one assignment that modifies entity data
    found_entity_data_assignment = any(
        _has_entity_data_assignments(construct_definition=construct_definition)
        for construct_definition in utils.get_all_construct_definitions(combined_ast=combined_ast)
    )
    # Package up the metadata and return it
    metadata = external_types.ContentBundleMetadata(
        schemaVersion=__schema_version__,
        compilerVersion=__version__,
        grammarVersion=__grammar_version__,
        referencedEnums=referenced_enum_names,
        referencedFunctionNames=referenced_custom_function_names,
        timeOfDayParameterizedReactions=time_of_day_parameterized_reactions,
        timeOfDayParameterizedQueries=time_of_day_parameterized_queries,
        hasEntityDataAssignments=found_entity_data_assignment
    )
    return metadata


def _get_all_referenced_enum_names(*, ast_chunk: Any) -> list[external_types.EnumName]:
    """Return the names of all enums referenced in the given AST chunk.

    This list will be stored in the compiled content bundle, where it's used for
    validation purposes upon the initialization of a Viv runtime.

    Args:
        ast_chunk: The full or partial AST to search for enum references.

    Returns:
        A list containing the names of all the enums referenced in the given AST chunk.
    """
    all_enum_expressions: list[external_types.Enum] = utils.get_all_expressions_of_type(
        expression_type=external_types.ExpressionDiscriminator.ENUM,
        ast_chunk=ast_chunk
    )
    all_referenced_enum_names = {expression['value']['name'] for expression in all_enum_expressions}
    return sorted(all_referenced_enum_names)


def _get_all_referenced_custom_function_names(*, ast_chunk: Any) -> list[external_types.CustomFunctionName]:
    """Return the names of all custom functions referenced in the given AST chunk.

    This list will be stored in the compiled content bundle, where it's used for
    validation purposes upon the initialization of a Viv runtime.

    Args:
        ast_chunk: The full or partial AST to search for custom-function references.

    Returns:
        A list containing the names of all the custom functions referenced in the given AST chunk.
    """
    all_custom_function_calls: list[external_types.CustomFunctionCall] = utils.get_all_expressions_of_type(
        expression_type=external_types.ExpressionDiscriminator.CUSTOM_FUNCTION_CALL,
        ast_chunk=ast_chunk
    )
    all_referenced_custom_function_names = {expression['value']['name'] for expression in all_custom_function_calls}
    return sorted(all_referenced_custom_function_names)


def _get_time_of_day_parameterized_reactions(
    *,
    combined_ast: internal_types.CombinedAST
) -> list[external_types.TimeOfDayParameterizedReaction]:
    """Return a list specifying all reactions that are parameterized by time of day.

    This list will be stored in the compiled content bundle, where it's used for
    validation purposes upon the initialization of a Viv runtime.

    Args:
        combined_ast: A combined AST that has undergone all postprocessing.

    Returns:
        A list specifying all reactions that are parameterized by time of day.
    """
    time_of_day_parameterized_reactions = []
    for construct_definition in utils.get_all_construct_definitions(combined_ast=combined_ast):
        all_nested_reactions: list[external_types.Reaction] = utils.get_all_expressions_of_type(
            expression_type=external_types.ExpressionDiscriminator.REACTION,
            ast_chunk=construct_definition
        )
        for reaction in all_nested_reactions:
            if reaction["value"]["time"]:
                for temporal_constraint in reaction["value"]["time"]:
                    if temporal_constraint["type"] == external_types.TemporalStatementDiscriminator.TIME_OF_DAY:
                        time_of_day_parameterized_reaction = external_types.TimeOfDayParameterizedReaction(
                            constructType=construct_definition["type"],
                            constructName=construct_definition["name"],
                            reaction=reaction["value"]["targetName"]
                        )
                        time_of_day_parameterized_reactions.append(time_of_day_parameterized_reaction)
    return time_of_day_parameterized_reactions


def _get_time_of_day_parameterized_queries(
    *,
    combined_ast: internal_types.CombinedAST
) -> list[external_types.QueryName]:
    """Return a list specifying all queries that are parameterized by time of day.

    This list will be stored in the compiled content bundle, where it's used for
    validation purposes upon the initialization of a Viv runtime.

    Args:
        combined_ast: A combined AST that has undergone all postprocessing.

    Returns:
        A list specifying all queries that are parameterized by time of day.
    """
    time_of_day_parameterized_queries: list[external_types.QueryName] = []
    for query_definition in combined_ast["queries"]:
        if query_definition['time']:
            for temporal_constraint in query_definition["time"]:
                if temporal_constraint["type"] == external_types.TemporalStatementDiscriminator.TIME_OF_DAY:
                    time_of_day_parameterized_queries.append(query_definition['name'])
    return time_of_day_parameterized_queries


def _has_entity_data_assignments(*, construct_definition: internal_types.IntermediateConstructDefinition) -> bool:
    """Return whether the given construct definition has at least one assignment that modifies entity data.

    Args:
        construct_definition: The construct definition in question.

    Returns:
        Whether the given construct definition has at least one assignment that modifies entity data.
    """
    all_assignments: list[external_types.Assignment] = utils.get_all_expressions_of_type(
        expression_type=external_types.ExpressionDiscriminator.ASSIGNMENT,
        ast_chunk=construct_definition
    )
    for assignment in all_assignments:
        # Any entity-reference assignment modifies entity data
        if assignment["value"]["left"]["type"] == external_types.ExpressionDiscriminator.ENTITY_REFERENCE:
            return True
        # A symbol-reference assignment modifies entity data if it includes a pointer,
        # since pointers always target entity data, by definition.
        assignment_lhs: external_types.ReferenceValue = assignment["value"]["left"]["value"]
        for component in assignment_lhs["path"]:
            if component["type"] == external_types.ReferencePathComponentDiscriminator.REFERENCE_PATH_COMPONENT_POINTER:
                return True
    return False
