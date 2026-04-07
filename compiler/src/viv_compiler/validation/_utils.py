"""Utility functions used internally within the validation module."""

from typing import Any

from viv_compiler import config, errors, external_types, utils


def get_all_action_role_names(*, action_definition: external_types.ActionDefinition) -> set[external_types.RoleName]:
    """Return a set containing the names of all roles associated with the given action definition.

    Args:
        action_definition: The action definition whose role names will be returned.

    Returns:
        A set containing the names of all roles associated with the given action definition.
    """
    return config.SPECIAL_ROLE_NAMES | set(action_definition['roles'])


def get_all_assigned_scratch_variable_names(*, ast_chunk: Any) -> list[external_types.VariableName]:
    """Return a list of the names of all scratch variables that are assigned anywhere in the given AST chunk.

    Args:
        ast_chunk: The full or partial AST to search for scratch variables being assigned.

    Returns:
        A list containing the names of all scratch variables that are assigned anywhere in the given AST chunk.
    """
    all_assigned_scratch_variable_names = set()
    all_assignments: list[external_types.Assignment] = utils.get_all_expressions_of_type(
        expression_type=external_types.ExpressionDiscriminator.ASSIGNMENT,
        ast_chunk=ast_chunk
    )
    for assignment in all_assignments:
        # Move on if the effective prefix is not `@this.scratch.`
        lhs = assignment["value"]['left']
        if lhs['type'] != external_types.ExpressionDiscriminator.ENTITY_REFERENCE:
            continue
        if lhs['value']['local']:
            continue
        if lhs['value']['anchor'] != config.SCRATCH_VARIABLE_REFERENCE_ANCHOR:
            continue
        if lhs['value']['path'][0] != config.SCRATCH_VARIABLE_REFERENCE_PATH_PREFIX[0]:
            continue
        if not lhs['value']['path'][1:]:  # Author manually wrote `@this.scratch` (only) -- weird, but not illegal
            continue
        # Now determine if the LHS of the assignment is a bare scratch variable, i.e., an effective `@this.scratch.var`
        lhs_value: external_types.ReferenceValue = lhs['value']
        head, *tail = lhs_value['path'][1:]
        if tail:
            continue
        if head['type'] != external_types.ReferencePathComponentDiscriminator.REFERENCE_PATH_COMPONENT_PROPERTY_NAME:
            # Move on if we somehow have a pointer or lookup after an explicit `@this.scratch` (not idiomatic)
            continue
        all_assigned_scratch_variable_names.add(head['name'])
    return sorted(all_assigned_scratch_variable_names)


def get_all_referenced_scratch_variable_names(*, ast_chunk: Any) -> list[external_types.VariableName]:
    """Return a list of the names of all scratch variables that are referenced anywhere in the given AST chunk.

    Args:
        ast_chunk: The full or partial AST to search for scratch variables being referenced.

    Returns:
        A list containing the names of all scratch variables that are referenced anywhere in the given AST chunk.
    """
    all_referenced_scratch_variable_names = set()
    all_entity_references: list[external_types.EntityReference] = utils.get_all_expressions_of_type(
        expression_type=external_types.ExpressionDiscriminator.ENTITY_REFERENCE,
        ast_chunk=ast_chunk
    )
    for entity_reference in all_entity_references:
        # Move on if the effective prefix is not `@this.scratch.`
        if entity_reference['value']['local']:
            continue
        if entity_reference['value']['anchor'] != config.SCRATCH_VARIABLE_REFERENCE_ANCHOR:
            continue
        if not entity_reference['value']['path']:  # Bare `@this`
            continue
        if entity_reference['value']['path'][0] != config.SCRATCH_VARIABLE_REFERENCE_PATH_PREFIX[0]:
            continue
        if not entity_reference['value']['path'][1:]:
            # Author manually wrote `@this.scratch` (only) -- weird, but not illegal
            continue
        # Now determine if the LHS of the assignment is a bare scratch variable, i.e., an effective `@this.scratch.var`
        head, *_ = entity_reference['value']['path'][1:]
        if head['type'] != external_types.ReferencePathComponentDiscriminator.REFERENCE_PATH_COMPONENT_PROPERTY_NAME:
            # Move on if we somehow have a pointer or lookup after an explicit `@this.scratch` (not idiomatic)
            continue
        all_referenced_scratch_variable_names.add(head['name'])
    return sorted(all_referenced_scratch_variable_names)


def get_all_negated_expressions(*, ast_chunk: Any) -> list[external_types.Expression]:
    """
    Return every negated expression in the given AST chunk.

    Args:
        ast_chunk: The full or partial AST to search for negated expressions.

    Returns:
        A list containing all the negated Viv expressions in the given AST chunk.
    """
    negated_expressions = []
    if isinstance(ast_chunk, list):
        for element in ast_chunk:
            negated_expressions.extend(get_all_negated_expressions(ast_chunk=element))
    elif isinstance(ast_chunk, dict):
        if ast_chunk.get("negated"):
            negated_expressions.append(ast_chunk)
        for value in ast_chunk.values():
            negated_expressions.extend(get_all_negated_expressions(ast_chunk=value))
    return negated_expressions


def detect_cycle_in_graph(*, adjacency_graph: dict[str, set[str]]) -> list[str] | None:
    """Returns a list describing a directed cycle in the given adjacency graph, if there is one, else `None`.

    Args:
        adjacency_graph: A mapping from node names to the set of node names to which they have outgoing edges.

    Returns:
        A list describing a directed cycle in the given adjacency graph, if there is one, else `None`.
    """
    white, gray, black = 0, 1, 2
    color = {name: white for name in adjacency_graph}
    stack = []

    def dfs(u: str) -> list[str] | None:
        """Carry out depth-first search starting from the given node, returning any detected cycle, else `None`.

        Args:
            u: The node from which to conduct a depth-first search (in the adjacency graph).

        Returns:
             A list describing an encountered directed cycle, if any, else `None`.
        """
        color[u] = gray
        stack.append(u)
        for v in adjacency_graph[u]:
            if color[v] == white:
                detected_cycle = dfs(v)
                if detected_cycle:
                    return detected_cycle
            elif color[v] == gray:
                # Found a cycle
                if v in stack:
                    i = stack.index(v)
                    return stack[i:] + [v]
                else:
                    return [v, u, v]
        stack.pop()
        color[u] = black
        return None

    for name in adjacency_graph:
        if color[name] == white:
            cycle = dfs(name)
            if cycle:
                return cycle
    return None


def expressions_are_equivalent(
    *,
    first_expression: external_types.Expression,
    second_expression: external_types.Expression
) -> bool:
    """Return whether the two given expressions are semantically equivalent.

    This procedure compares every field in the respective expression dictionaries,
    save for source annotations.

    Args:
        first_expression: The first expression to compare.
        second_expression: The second expression to compare.

    Returns:
        `True` if the two expressions are semantically equal, else `False`.
    """
    equivalent = (
        {key: val for key, val in first_expression.items() if key != "source"} ==
        {key: val for key, val in second_expression.items() if key != "source"}
    )
    return equivalent


def is_non_numeric_expression(*, expression: external_types.Expression) -> bool:
    """Returns `True` if the given expression will certainly evaluate to a non-numeric value, else `False`.

    Note that we ultimately can't know what kinds of values certain expressions will produce,
    since they may depend on the host application (e.g., an adapter-function call).

    Args:
        expression: The expression in question.

    Returns:
        `True` if the given expression will certainly evaluate to a non-numeric value, else `False`.

    Raises:
        VivCompileError: Unexpected expression discriminator.
    """
    match expression['type']:
        case external_types.ExpressionDiscriminator.ACTION_RELATION:
            return True
        case external_types.ExpressionDiscriminator.ACTION_SEARCH:
            return True
        case external_types.ExpressionDiscriminator.CUSTOM_FUNCTION_CALL:
            return False
        case external_types.ExpressionDiscriminator.ASSIGNMENT:
            return True
        case external_types.ExpressionDiscriminator.ARITHMETIC_EXPRESSION:
            return False
        case external_types.ExpressionDiscriminator.BOOL:
            return True
        case external_types.ExpressionDiscriminator.CHANCE_EXPRESSION:
            return True
        case external_types.ExpressionDiscriminator.COMPARISON:
            return True
        case external_types.ExpressionDiscriminator.CONDITIONAL:
            return False
        case external_types.ExpressionDiscriminator.CONJUNCTION:
            return True
        case external_types.ExpressionDiscriminator.DISJUNCTION:
            return True
        case external_types.ExpressionDiscriminator.ENTITY_REFERENCE:
            return False
        case external_types.ExpressionDiscriminator.ENUM:
            return False
        case external_types.ExpressionDiscriminator.FLOAT:
            return False
        case external_types.ExpressionDiscriminator.INSPECTION:
            return True
        case external_types.ExpressionDiscriminator.INSCRIPTION:
            return True
        case external_types.ExpressionDiscriminator.INT:
            return False
        case external_types.ExpressionDiscriminator.LIST:
            return True
        case external_types.ExpressionDiscriminator.LOOP:
            return False
        case external_types.ExpressionDiscriminator.MEMBERSHIP_TEST:
            return True
        case external_types.ExpressionDiscriminator.MEMORY_CHECK:
            return True
        case external_types.ExpressionDiscriminator.NULL_TYPE:
            return True
        case external_types.ExpressionDiscriminator.OBJECT:
            return True
        case external_types.ExpressionDiscriminator.REACTION:
            return True
        case external_types.ExpressionDiscriminator.SIFTING:
            return True
        case external_types.ExpressionDiscriminator.STRING:
            return True
        case external_types.ExpressionDiscriminator.SYMBOL_REFERENCE:
            return False
        case external_types.ExpressionDiscriminator.TEMPLATE_STRING:
            return True
        case external_types.ExpressionDiscriminator.TROPE_FIT:
            return True
        case _:
            raise errors.VivCompileError(
                msg=f"Unexpected expression discriminator: '{expression['type']}'",
                source=expression.get('source'),
            )
