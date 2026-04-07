"""Internal functionality for validating query definitions."""

__all__ = ["validate_query_definitions"]

from viv_compiler import config, errors, external_types
from ._common import validate_common_concerns
from ._utils import expressions_are_equivalent


def validate_query_definitions(*, content_bundle: external_types.ContentBundle) -> None:
    """Validate the query definitions in the given compiled content bundle.

    Args:
        content_bundle: A compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.
    """
    for query_definition in content_bundle["queries"].values():
        # Validate general issues that pertain to all construct types
        validate_common_concerns(construct_definition=query_definition, content_bundle=content_bundle)
        # Validate `actionName` field
        _validate_query_action_field(query_definition=query_definition, content_bundle=content_bundle)
        # Validate `time` field
        _validate_query_time_field(query_definition=query_definition)
        # Validate fields defined using set predicates
        _validate_query_set_predicates(query_definition=query_definition)


def _validate_query_action_field(
    *,
    query_definition: external_types.QueryDefinition,
    content_bundle: external_types.ContentBundle
) -> None:
    """Validate the given query definition's `actionName` field.

    Args:
        query_definition: A query definition in a compiled content bundle.
        content_bundle: A compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: The query references an undefined action.
    """
    action_name_field = query_definition["actionName"]
    if action_name_field is None:
        return
    for set_predicate in action_name_field:
        for action_name_expression in set_predicate["operand"]:
            action_name = action_name_expression["value"]
            if action_name not in content_bundle["actions"]:
                raise errors.VivCompileError(
                    msg=f"Query '{query_definition['name']}' references undefined action: '{action_name}'",
                    source=action_name_expression['source'],
                )


def _validate_query_time_field(*, query_definition: external_types.QueryDefinition) -> None:
    """Validate the given query definition's `time` field.

    Args:
        query_definition: A query definition in a compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: Multiple time-of-day constraints.
        VivCompileError: Multiple time-frame constraints.
    """
    time_field = query_definition['time']
    if time_field is None:
        return
    time_of_day_constraints = 0
    time_frame_constraints = 0
    for temporal_constraint in time_field:
        if temporal_constraint['type'] == external_types.TemporalStatementDiscriminator.TIME_OF_DAY:
            time_of_day_constraints += 1
            if time_of_day_constraints > 1:
                raise errors.VivCompileError(
                    f"Query '{query_definition['name']}' has multiple time-of-day "
                    "temporal constraints (only one is allowed)"
                )
        else:
            time_frame_constraints += 1
            if time_frame_constraints > 1:
                raise errors.VivCompileError(
                    f"Query '{query_definition['name']}' has multiple time-frame temporal "
                    f"constraints (only one is allowed)"
                )


def _validate_query_set_predicates(*, query_definition: external_types.QueryDefinition) -> None:
    """Validate the use of set predicates in the given query definition.

    Args:
        query_definition: A query definition in a compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: 'all' operator in singular-value field.
        VivCompileError: Duplicate values in operand.
        VivCompileError: 'exactly' with multiple operands in singular-value field.
        VivCompileError: 'exactly' with additional criteria.
    """
    for field_name, potential_set_predicates in query_definition.items():
        if field_name not in config.QUERY_FIELDS_TAKING_SET_PREDICATES:
            continue
        if potential_set_predicates is None:
            continue
        set_predicates: list[external_types.SetPredicate] = potential_set_predicates
        for set_predicate in set_predicates:
            if set_predicate["operator"] == "all":
                if field_name in config.QUERY_FIELDS_WITH_SINGULAR_VALUE:
                    raise errors.VivCompileError(
                        f"Query '{query_definition['name']}' uses 'all' operator in '{field_name}' field, "
                        f"but this is not allowed because this field corresponds to a singular value "
                        f"(use 'exactly' to specify a single possibility)"
                    )
            for i, operand in enumerate(set_predicate['operand']):
                operand: external_types.Expression
                for j, other_operand in enumerate(set_predicate['operand']):
                    other_operand: external_types.Expression
                    if i == j:
                        continue
                    if expressions_are_equivalent(first_expression=operand, second_expression=other_operand):
                        raise errors.VivCompileError(
                            f"Query '{query_definition['name']}' has duplicate value following "
                            f"'{set_predicate['operator']}' operator in the '{field_name}' field"
                        )
            if set_predicate["operator"] == "exactly":
                if field_name in config.QUERY_FIELDS_WITH_SINGULAR_VALUE:
                    if len(set_predicate['operand']) > 1:
                        raise errors.VivCompileError(
                            f"Query '{query_definition['name']}' uses 'exactly' operator in '{field_name}' field, "
                            f"but then has multiple operand components (only a single '{field_name}' can be "
                            f"specified when 'exactly' is used)"
                        )
                if len(set_predicates) > 1:
                    raise errors.VivCompileError(
                        f"Query '{query_definition['name']}' uses 'exactly' operator in '{field_name}' field, "
                        f"but then has additional criteria ('exactly' must be alone when present)"
                    )
