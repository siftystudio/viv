"""Internal functionality for validating concerns that are common across construct types."""

__all__ = ["validate_common_concerns"]

from viv_compiler import config, errors, external_types, utils
from ._roles import validate_roles
from ._utils import (
    expressions_are_equivalent,
    get_all_action_role_names,
    get_all_assigned_scratch_variable_names,
    get_all_negated_expressions,
    get_all_referenced_scratch_variable_names,
    is_non_numeric_expression
)


def validate_common_concerns(
    *,
    construct_definition: external_types.ConstructDefinition,
    content_bundle: external_types.ContentBundle
) -> None:
    """Validate the given construct definition along several concerns that are common to all construct types.

    Args:
        construct_definition: The construct definition to validate.
        content_bundle: The compiled content bundle containing the construct definition.

    Returns:
        None. Only returns if no issue was detected downstream.
    """
    # Validate role definitions
    validate_roles(construct_definition=construct_definition)
    # Validate conditions
    _validate_conditions(construct_definition=construct_definition)
    # Validate reactions
    _validate_reactions(construct_definition=construct_definition, content_bundle=content_bundle)
    # Validate action searches
    _validate_action_searches(construct_definition=construct_definition, content_bundle=content_bundle)
    # Validate sifting expressions
    _validate_sifting_expressions(construct_definition=construct_definition, content_bundle=content_bundle)
    # Validate trope-fit expressions
    _validate_trope_fits(construct_definition=construct_definition, content_bundle=content_bundle)
    # Validate application of the group-role decorator
    _validate_group_role_references(construct_definition=construct_definition)
    # Validate that action-relation operators do not have group-role operands
    _validate_action_relation_operands(construct_definition=construct_definition)
    # Validate reference paths
    _validate_reference_paths(construct_definition=construct_definition)
    # Validate loops
    _validate_loops(construct_definition=construct_definition)
    # Validate assignments
    _validate_assignments(construct_definition=construct_definition)
    # Validate references to scratch variables
    _validate_scratch_variable_usage(construct_definition=construct_definition)
    # Validate negated expressions
    _validate_negated_expressions(construct_definition=construct_definition)
    # Validate chance expressions
    _validate_chance_expressions(construct_definition=construct_definition)


def _validate_conditions(*, construct_definition: external_types.ConstructDefinition) -> None:
    """Validate the given construct definition's `conditions` field.

    Args:
        construct_definition: A construct definition in a compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: The construct definition has an invalid condition.
    """
    # Gather all the conditions, which by now are grouped under roles
    all_conditions: list[external_types.WrappedExpression] = list(
        construct_definition['conditions']['globalConditions']
    )
    for condition_group in construct_definition['conditions']['roleConditions'].values():
        all_conditions += condition_group
    # Validate each one in turn
    for condition in all_conditions:
        for reference in condition['references']:
            role_definition: external_types.RoleDefinition = construct_definition['roles'][reference]
            if role_definition['spawn']:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                    f"'{construct_definition['name']}' has condition that references role '{reference}', "
                    f"which carries the 'spawn' label (prohibited because its entity won't be built until "
                    f"after the conditions have already been evaluated",
                    source=condition['body']['source']
                )


def _validate_reactions(
    *,
    construct_definition: external_types.ConstructDefinition,
    content_bundle: external_types.ContentBundle
) -> None:
    """Validate the given construct definition's use of reactions.

    Args:
        construct_definition: A construct definition in a compiled content bundle.
        content_bundle: A compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: Reaction declared in construct type that does not permit reactions.
        VivCompileError: Reaction housed in wrong field of action.
        VivCompileError: Reaction queues undefined action, plan, action selector, or plan selector.
        VivCompileError: Reaction queues construct with unexpected type (defensive).
        VivCompileError: Reaction fails to precast initiator role of target construct.
        VivCompileError: Reaction fails to cast a required role when providing a full cast.
        VivCompileError: Reaction fails to precast a precast role of the target construct.
        VivCompileError: Reaction precasts a role not found in the target construct.
        VivCompileError: Priority field on reaction that does not queue an action or action selector.
        VivCompileError: Non-numeric expression in reaction priority field.
        VivCompileError: Time field on reaction that does not queue an action or action selector.
        VivCompileError: Multiple time-of-day temporal constraints in reaction.
        VivCompileError: Multiple from-action temporal constraints in reaction.
        VivCompileError: Multiple from-hearing temporal constraints in reaction.
        VivCompileError: Location field on reaction that does not queue an action or action selector.
        VivCompileError: Location field uses the 'all' operator.
        VivCompileError: Location 'exactly' operator with multiple operands.
        VivCompileError: Location 'exactly' operator with additional criteria.
        VivCompileError: Duplicate value in location operands.
        VivCompileError: Repeat field missing required 'if' subfield.
        VivCompileError: Repeat field missing required 'max' subfield.
    """
    # Collect all reactions
    all_reactions: list[external_types.Reaction] = utils.get_all_expressions_of_type(
        expression_type=external_types.ExpressionDiscriminator.REACTION,
        ast_chunk=construct_definition
    )
    # If this is not a construct type allowing reactions, ensure that there are no reaction declarations whatsoever
    if all_reactions:
        if construct_definition['type'] not in config.CONSTRUCT_TYPES_PERMITTING_REACTIONS:
            error_message = (
                f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                f"'{construct_definition['name']}' contains a reaction declaration (not permitted in "
                f"this construct type)"
            )
            raise errors.VivCompileError(error_message, source=all_reactions[0]['source'])
    # Make sure that all reactions are housed in the proper fields
    if construct_definition['type'] == external_types.ConstructDiscriminator.ACTION:
        for field_name, field_value in construct_definition.items():
            if field_name not in config.ACTION_FIELDS_PERMITTING_REACTIONS:
                reactions_in_this_field: list[external_types.Reaction] = utils.get_all_expressions_of_type(
                    expression_type=external_types.ExpressionDiscriminator.REACTION,
                    ast_chunk=field_value
                )
                if reactions_in_this_field:
                    error_message = (
                        f"Action '{construct_definition['name']}' has reaction in '{field_name}' field "
                        f"(only allowed in 'reactions' field)"
                    )
                    raise errors.VivCompileError(error_message, source=reactions_in_this_field[0]["source"])
    # Validate each reaction in turn
    for reaction_expression in all_reactions:
        reaction: external_types.ReactionValue = reaction_expression['value']
        reaction_source = reaction_expression['source']
        # Make sure the reaction queues a valid construct
        queued_construct_name = reaction['targetName']
        if reaction['targetType'] == external_types.ConstructDiscriminator.ACTION:
            try:
                queued_construct_definition = content_bundle["actions"][queued_construct_name]
            except KeyError:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                    f"'{construct_definition['name']}' has reaction that queues undefined action: "
                    f"'{queued_construct_name}'",
                    source=reaction_source
                )
        elif reaction['targetType'] == external_types.ConstructDiscriminator.PLAN:
            try:
                queued_construct_definition = content_bundle["plans"][queued_construct_name]
            except KeyError:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                    f"'{construct_definition['name']}' has reaction that queues undefined plan: "
                    f"'{queued_construct_name}'",
                    source=reaction_source
                )
        elif reaction['targetType'] == external_types.ConstructDiscriminator.ACTION_SELECTOR:
            try:
                queued_construct_definition = content_bundle["actionSelectors"][queued_construct_name]
            except KeyError:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                    f"'{construct_definition['name']}' has reaction that queues undefined action "
                    f"selector: '{queued_construct_name}'",
                    source=reaction_source
                )
        elif reaction['targetType'] == external_types.ConstructDiscriminator.PLAN_SELECTOR:
            try:
                queued_construct_definition = content_bundle["planSelectors"][queued_construct_name]
            except KeyError:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                    f"'{construct_definition['name']}' has reaction that queues undefined plan selector:"
                    f" '{queued_construct_name}'",
                    source=reaction_source
                )
        else:
            raise errors.VivCompileError(
                f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                f"'{construct_definition['name']}' has reaction that queues construct with unexpected "
                f"type: '{reaction['targetType']}'",
                source=reaction_source
            )
        # If applicable, make sure the reaction binds an initiator role
        if queued_construct_definition['type'] in config.CONSTRUCT_TYPES_USING_INITIATOR_ROLES:
            if queued_construct_definition['initiator'] not in reaction['bindings']['roles']:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                    f"'{construct_definition['name']}' has '{queued_construct_name}' reaction that fails to precast "
                    f"its initiator role '{queued_construct_definition['initiator']}' (required when queueing a "
                    f"{utils.CONSTRUCT_LABEL[queued_construct_definition['type']].lower()})",
                    source=reaction_source
                )
        # Detect missing required roles
        if not reaction['bindings']['partial']:
            for role_definition in queued_construct_definition["roles"].values():
                if role_definition['min'] > 0 and role_definition['name'] not in reaction['bindings']['roles']:
                    raise errors.VivCompileError(
                        f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                        f"'{construct_definition['name']}' has '{queued_construct_name}' reaction "
                        f"that fails to cast required role '{role_definition['name']}' "
                        f"(use 'partial' to pass a partial cast)",
                        source=reaction_source
                    )
        # Detect missing 'precast' roles
        for role_definition in queued_construct_definition['roles'].values():
            if role_definition['precast']:
                if role_definition['name'] not in reaction['bindings']['roles']:
                    raise errors.VivCompileError(
                        f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                        f"'{construct_definition['name']}' has '{queued_construct_name}' reaction "
                        f"that fails to precast one of its 'precast' roles: '{role_definition['name']}'",
                        source=reaction_source
                    )
        # Detect extra roles
        for role_name in reaction['bindings']['roles']:
            if role_name not in queued_construct_definition['roles']:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                    f"'{construct_definition['name']}' has '{queued_construct_name}' reaction that precasts "
                    f"role '{role_name}', but the target construct has no role by that name",
                    source=reaction_source
                )
        # Validate reaction priority
        if reaction['priority']:
            if reaction['targetType'] not in (
                external_types.ConstructDiscriminator.ACTION,
                external_types.ConstructDiscriminator.ACTION_SELECTOR
            ):
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                    f"'{construct_definition['name']}' has '{queued_construct_name}' reaction with 'priority' "
                    f"field (only allowed for reactions that queue actions or action selectors)",
                    source=reaction_source
                )
            if is_non_numeric_expression(expression=reaction['priority']):
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                    f"'{construct_definition['name']}' has '{queued_construct_name}' reaction with invalid expression "
                    f"type for 'priority' field (value will be non-numeric)",
                    source=reaction_source
                )
        # Validate the optional 'time' field, if it's present
        time_of_day_constraints = 0
        time_frame_from_action_constraints = 0
        time_frame_from_hearing_constraints = 0
        if reaction['time']:
            if reaction['targetType'] not in (
                external_types.ConstructDiscriminator.ACTION,
                external_types.ConstructDiscriminator.ACTION_SELECTOR
            ):
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                    f"'{construct_definition['name']}' has '{queued_construct_name}' reaction with 'time' field "
                    f"(only allowed for reactions that queue actions or action selectors)",
                    source=reaction_source
                )
            for temporal_constraint in reaction['time']:
                if temporal_constraint['type'] == external_types.TemporalStatementDiscriminator.TIME_OF_DAY:
                    time_of_day_constraints += 1
                    if time_of_day_constraints > 1:
                        raise errors.VivCompileError(
                            f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                            f"'{construct_definition['name']}' has '{queued_construct_name}' reaction "
                            f"with multiple time-of-day temporal constraints (only one is allowed)",
                            source=reaction_source
                        )
                elif temporal_constraint['useActionTimestamp']:
                    time_frame_from_action_constraints += 1
                    if time_frame_from_action_constraints > 1:
                        raise errors.VivCompileError(
                            f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                            f"'{construct_definition['name']}' has '{queued_construct_name}' reaction "
                            f"with multiple 'from action' temporal constraints (only one is allowed)",
                            source=reaction_source
                        )
                else:  # temporal_constraint['useActionTimestamp'] == false
                    time_frame_from_hearing_constraints += 1
                    if time_frame_from_hearing_constraints > 1:
                        raise errors.VivCompileError(
                            f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                            f"'{construct_definition['name']}' has '{queued_construct_name}' reaction "
                            f"with multiple 'from hearing' temporal constraints (only one is allowed)",
                            source=reaction_source
                        )
        # Validate the optional 'location' field, if it's present
        if reaction['location']:
            if reaction['targetType'] not in (
                external_types.ConstructDiscriminator.ACTION,
                external_types.ConstructDiscriminator.ACTION_SELECTOR
            ):
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                    f"'{construct_definition['name']}' has '{queued_construct_name}' reaction with 'location' "
                    f"field (only allowed for reactions that queue actions or action selectors)",
                    source=reaction_source
                )
            for set_predicate in reaction['location']:
                set_predicate: external_types.SetPredicate
                if set_predicate["operator"] == "all":
                    raise errors.VivCompileError(
                        f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                        f"'{construct_definition['name']}' has '{queued_construct_name}' reaction that uses the"
                        f"'all' operator, but this is not allowed because this field corresponds to a singular value "
                        f"(use 'exactly' to specify a single possibility)",
                        source=reaction_source
                    )
                if set_predicate['operator'] == "exactly":
                    if len(set_predicate['operand']) > 1:
                        raise errors.VivCompileError(
                            f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                            f"'{construct_definition['name']}' has '{queued_construct_name}' reaction that uses the"
                            f"'exactly' operator in 'location' field, but then has multiple operand components "
                            f"(only a single location can be specified when 'exactly' is used)",
                            source=reaction_source
                        )
                    if len(reaction['location']) > 1:
                        raise errors.VivCompileError(
                            f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                            f"'{construct_definition['name']}' has '{queued_construct_name}' reaction that uses the"
                            f"'exactly' operator in 'location' field, but then has additional criteria there "
                            f"('exactly' must be alone when present)",
                            source=reaction_source
                        )
                for i, operand in enumerate(set_predicate['operand']):
                    operand: external_types.Expression
                    for j, other_operand in enumerate(set_predicate['operand']):
                        other_operand: external_types.Expression
                        if i == j:
                            continue
                        if expressions_are_equivalent(first_expression=operand, second_expression=other_operand):
                            raise errors.VivCompileError(
                                f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                                f"'{construct_definition['name']}' has '{queued_construct_name}' reaction with "
                                f"duplicate value following '{set_predicate['operator']}' operator in 'location' field",
                                source=reaction_source
                            )
        # Validate the optional 'repeatLogic' field, if it's present
        if reaction['repeatLogic']:
            if not reaction['repeatLogic']["conditions"]:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                    f"'{construct_definition['name']}' has '{queued_construct_name}' reaction with 'repeat' "
                    f"field that is missing required 'if' subfield",
                    source=reaction_source
                )
            if reaction['repeatLogic']["maxRepeats"] is None:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                    f"'{construct_definition['name']}' has '{queued_construct_name}' reaction with 'repeat' "
                    f"field that is missing required 'max' subfield",
                    source=reaction_source
                )


def _validate_action_searches(
    *,
    construct_definition: external_types.ConstructDefinition,
    content_bundle: external_types.ContentBundle
) -> None:
    """Validate the given construct definition's usage of action searches.

    Args:
        construct_definition: A construct definition in a compiled content bundle.
        content_bundle: A compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: Action search references undefined query.
        VivCompileError: Action search fails to cast a required role of the query.
        VivCompileError: Action search fails to precast a precast role of the query.
        VivCompileError: Action search precasts a role not found in the query.
        VivCompileError: Query uses memory fields but action search lacks 'over' declaration.
    """
    all_action_searches: list[external_types.ActionSearch] = utils.get_all_expressions_of_type(
        expression_type=external_types.ExpressionDiscriminator.ACTION_SEARCH,
        ast_chunk=construct_definition
    )
    for action_search in all_action_searches:
        action_search_value: external_types.ActionSearchValue = action_search['value']
        # Validate the search-domain preparation policy. This must come first, because it applies
        # even if there is no target query, which causes an immediate return below.
        _validate_search_domain_declaration(
            construct_definition=construct_definition,
            search_domain_declaration=action_search_value['searchDomain'],
            in_sifting=False,
            source=action_search['source']
        )
        # If this is a search without a query, move on
        query_name = action_search_value['queryName']
        if not query_name:
            continue
        # Otherwise, check if it targets an undefined query
        if query_name and query_name not in content_bundle["queries"]:
            raise errors.VivCompileError(
                f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                f"'{construct_definition['name']}' references undefined query: '{query_name}'",
                source=action_search['source']
            )
        # Detect missing required roles
        query_definition = content_bundle["queries"][query_name]
        if not action_search_value['bindings']['partial']:
            for role_definition in query_definition["roles"].values():
                if role_definition['min'] > 0:
                    if role_definition['name'] not in action_search_value['bindings']['roles']:
                        raise errors.VivCompileError(
                            f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                            f"'{construct_definition['name']}' fails to cast required role '{role_definition['name']}' "
                            f"when running search query '{query_name}' (use 'partial' to pass a partial cast)",
                            source=action_search['source']
                        )
        # Detect missing 'precast' roles
        for role_definition in query_definition['roles'].values():
            if role_definition['precast']:
                if role_definition['name'] not in action_search_value['bindings']['roles']:
                    raise errors.VivCompileError(
                        f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                        f"'{construct_definition['name']}' runs search query '{query_name}', "
                        f"but fails to precast one of its 'precast' roles: '{role_definition['name']}'",
                        source=action_search['source']
                    )
        # Detect extra roles
        for role_name in action_search_value['bindings']['roles']:
            if role_name not in query_definition['roles']:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                    f"'{construct_definition['name']}' precasts role '{role_name}' when running search "
                    f"query '{query_name}', but the query has no role by that name",
                    source=action_search['source']
                )
        # If the query uses memory fields, ensure that the search domain is a character's memories
        if query_definition['salience'] or query_definition['associations']:
            if not action_search_value['searchDomain']['expression']:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                    f"'{construct_definition['name']}' attempts to run search query '{query_name}', which uses the "
                    f"'salience' and/or 'associations' memory fields, but the action search does not specify a "
                    f"character whose memories will serve as the search domain (use the 'over' field to specify this)",
                    source=action_search['source']
                )


def _validate_sifting_expressions(
    *,
    construct_definition: external_types.ConstructDefinition,
    content_bundle: external_types.ContentBundle
) -> None:
    """Validate the given construct definition's usage of sifting expressions.

    Args:
        construct_definition: A construct definition in a compiled content bundle.
        content_bundle: A compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: Sifting expression references undefined sifting pattern.
        VivCompileError: Sifting expression fails to cast a required role of the pattern.
        VivCompileError: Sifting expression fails to precast a precast role of the pattern.
        VivCompileError: Sifting expression precasts a role not found in the pattern.
    """
    all_sifting_expressions: list[external_types.Sifting] = utils.get_all_expressions_of_type(
        expression_type=external_types.ExpressionDiscriminator.SIFTING,
        ast_chunk=construct_definition
    )
    for sifting_expression in all_sifting_expressions:
        sifting_expression_value = sifting_expression['value']
        # Retrieve the name of the sifting pattern referenced in the expression
        pattern_name = sifting_expression_value['patternName']
        # Check if targets to undefined sifting pattern
        if pattern_name not in content_bundle["siftingPatterns"]:
            error_message = (
                f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                f"'{construct_definition['name']}' references undefined sifting pattern: '{pattern_name}'"
            )
            raise errors.VivCompileError(error_message, source=sifting_expression["source"])
        # Validate the search-domain preparation policy
        _validate_search_domain_declaration(
            construct_definition=construct_definition,
            search_domain_declaration=sifting_expression_value['searchDomain'],
            in_sifting=True,
            source=sifting_expression['source']
        )
        # Detect missing required roles
        pattern_definition = content_bundle["siftingPatterns"][pattern_name]
        if not sifting_expression_value['bindings']['partial']:
            for role_definition in pattern_definition["roles"].values():
                if role_definition['min'] > 0:
                    if role_definition['name'] not in sifting_expression_value['bindings']['roles']:
                        raise errors.VivCompileError(
                            f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                            f"'{construct_definition['name']}' fails to cast required role '{role_definition['name']}' "
                            f"when attempting to sift pattern '{pattern_name}' "
                            f"(use 'partial' to pass a partial cast)",
                            source=sifting_expression['source']
                        )
        # Detect missing precast roles
        for role_definition in pattern_definition['roles'].values():
            if role_definition['precast']:
                if role_definition['name'] not in sifting_expression_value['bindings']['roles']:
                    raise errors.VivCompileError(
                        f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                        f"'{construct_definition['name']}' attempts to sift pattern '{pattern_name}', "
                        f"but fails to precast one of its 'precast' roles: '{role_definition['name']}'",
                        source=sifting_expression['source']
                    )
        # Detect extra roles
        for role_name in sifting_expression_value['bindings']['roles']:
            if role_name not in pattern_definition['roles']:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                    f"'{construct_definition['name']}' precasts role '{role_name}' when attempting to sift pattern "
                    f"'{pattern_name}', but the pattern has no role by that name",
                    source=sifting_expression['source']
                )


def _validate_trope_fits(
    *,
    construct_definition: external_types.ConstructDefinition,
    content_bundle: external_types.ContentBundle
) -> None:
    """Validate the given construct definition's usage of trope-fit expressions.

    Note: In the course of resolving any positional bindings, we will have already flagged
    any cases of trope fits that target undefined tropes.

    Args:
        construct_definition: A construct definition in a compiled content bundle.
        content_bundle: A compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: Trope-fit expression fails to cast a required role of the trope.
        VivCompileError: Trope-fit expression fails to precast a precast role of the trope.
        VivCompileError: Trope-fit expression precasts a role not found in the trope.
    """
    all_trope_fits: list[external_types.TropeFit] = utils.get_all_expressions_of_type(
        expression_type=external_types.ExpressionDiscriminator.TROPE_FIT,
        ast_chunk=construct_definition
    )
    for trope_fit in all_trope_fits:
        trope_fit_expression: external_types.TropeFitValue = trope_fit['value']
        trope_fit_source = trope_fit['source']
        # Retrieve the definition of the target trope
        trope_name = trope_fit_expression['tropeName']
        trope_definition = content_bundle["tropes"][trope_name]
        # Detect missing required roles
        if not trope_fit_expression['bindings']['partial']:
            for role_definition in trope_definition["roles"].values():
                if role_definition['min'] > 0:
                    if role_definition['name'] not in trope_fit_expression['bindings']['roles']:
                        raise errors.VivCompileError(
                            f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                            f"'{construct_definition['name']}' fails to cast required role '{role_definition['name']}' "
                            f"when attempting to fit trope '{trope_name}' (use 'partial' to pass a partial cast)",
                            source=trope_fit_source
                        )
        # Detect missing precast roles
        for role_definition in trope_definition['roles'].values():
            if role_definition['precast']:
                if role_definition['name'] not in trope_fit_expression['bindings']['roles']:
                    raise errors.VivCompileError(
                        f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                        f"'{construct_definition['name']}' attempts to fit trope '{trope_name}', "
                        f"but fails to precast one of its 'precast' roles: '{role_definition['name']}'",
                        source=trope_fit_source
                    )
        # Detect extra roles
        for role_name in trope_fit_expression['bindings']['roles']:
            if role_name not in trope_definition['roles']:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                    f"'{construct_definition['name']}' precasts role '{role_name}' when attempting to fit trope "
                    f"'{trope_name}', but the trope has no role by that name",
                    source=trope_fit_source
                )


def _validate_group_role_references(*, construct_definition: external_types.ConstructDefinition) -> None:
    """Validate the given construct definition's usage of the group-role decorator (or lack thereof).

    Args:
        construct_definition: A construct definition in a compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: Group-role decorator used on a special role.
        VivCompileError: Group-role decorator used on a singleton role (max < 2).
        VivCompileError: Group role referenced without the group-role decorator.
    """
    # Retrieve all references to group roles
    all_references: list[external_types.Reference] = utils.get_all_expressions_of_type(
        expression_type=external_types.ExpressionDiscriminator.ENTITY_REFERENCE,
        ast_chunk=construct_definition
    )
    all_references += utils.get_all_expressions_of_type(
        expression_type=external_types.ExpressionDiscriminator.SYMBOL_REFERENCE,
        ast_chunk=construct_definition
    )
    all_reference_values: list[external_types.ReferenceValue] = [reference["value"] for reference in all_references]
    all_group_role_names = [reference['anchor'] for reference in all_reference_values if reference['group']]
    # Make sure the group-role decorator is only used on roles that can cast multiple entities. Here, we'll also
    # include all our special roles, since these are always singletons.
    for group_role_name in all_group_role_names:
        error_message = (
            f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
            f"uses the group-role decorator '*' on a singleton role (one with a max of 1): '{group_role_name}'"
        )
        if group_role_name in config.SPECIAL_ROLE_NAMES:
            raise errors.VivCompileError(error_message)
        for role_definition in construct_definition['roles'].values():
            if role_definition['name'] == group_role_name:
                if role_definition['max'] < 2:
                    raise errors.VivCompileError(error_message)
                break
    # Make sure that all other references to group roles *do* use the group-role decorator
    all_singleton_role_names = [reference['anchor'] for reference in all_reference_values if not reference['group']]
    for singleton_role_name in all_singleton_role_names:
        for role_definition in construct_definition['roles'].values():
            if role_definition['name'] == singleton_role_name:
                if role_definition['max'] > 1:
                    raise errors.VivCompileError(
                        f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                        f"'{construct_definition['name']} references a group role without using the group-role "
                        f"decorator '*': '{singleton_role_name}'"
                    )
                break


def _validate_action_relation_operands(*, construct_definition: external_types.ConstructDefinition) -> None:
    """Validate that action-relation operators do not have group-role references as operands.

    Action-relation operators (`preceded`, `caused`, `triggered`) take single actions as operands. When a sifting
    pattern (or any construct) has a group action role, the author must use a loop to iterate over the group
    and test the relation for each member individually.

    Args:
        construct_definition: A construct definition in a compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: A group action role is used as an operand in an action-relation expression.
    """
    all_action_relations: list[external_types.ActionRelation] = utils.get_all_expressions_of_type(
        expression_type=external_types.ExpressionDiscriminator.ACTION_RELATION,
        ast_chunk=construct_definition
    )
    for action_relation in all_action_relations:
        left_operand = action_relation["value"]["left"]
        right_operand = action_relation["value"]["left"]
        for operand in (left_operand, right_operand):
            if operand['type'] != external_types.ExpressionDiscriminator.ENTITY_REFERENCE:
                continue
            operand: external_types.EntityReference
            if operand["value"]["group"]:
                error_message = (
                    f"Action relation has group-role operand (operands must be single actions; "
                    f"use a loop to iterate over the group)"
                )
                raise errors.VivCompileError(error_message, source=action_relation["source"])


def _validate_reference_paths(*, construct_definition: external_types.ConstructDefinition) -> None:
    """Validate the given construct definition's usage of reference paths.

    Args:
        construct_definition: A construct definition in a compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: A reference has a pointer as its first path component.
    """
    # Collect all entity and symbol references
    all_references: list[external_types.Reference] = utils.get_all_expressions_of_type(
        expression_type=external_types.ExpressionDiscriminator.ENTITY_REFERENCE,
        ast_chunk=construct_definition
    )
    all_references += utils.get_all_expressions_of_type(
        expression_type=external_types.ExpressionDiscriminator.SYMBOL_REFERENCE,
        ast_chunk=construct_definition
    )
    all_reference_values: list[external_types.ReferenceValue] = [reference["value"] for reference in all_references]
    # Make sure no reference has a pointer as its first path component. While a syntax like `@person->boss`
    # might seem required, because `@person` evaluates to an entity ID, Viv enables authors to directly
    # access the properties of the anchor entity, as in `@person.boss`. To reduce confusion, Viv enforces
    # that this pattern be used exclusively. Under the hood, this is supported by the interpreter hydrating
    # the anchor entity ID prior to walking a reference path.
    for reference in all_reference_values:
        if not reference['path']:
            continue
        pointer_type = external_types.ReferencePathComponentDiscriminator.REFERENCE_PATH_COMPONENT_POINTER
        if reference['path'][0]['type'] == pointer_type:
            raise errors.VivCompileError(
                f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
                f"has reference '@{reference['anchor']}' with a pointer as its first path component "
                f"(use '@{reference['anchor']}.{reference['path'][0]['propertyName']}' instead)"
            )


def _validate_loops(*, construct_definition: external_types.ConstructDefinition) -> None:
    """Validate the given construct definition's usage of loops.

    Note: The grammar already enforces that loop bodies may not be empty.

    Args:
        construct_definition: A construct definition from a compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: Loop iterates over a non-unpacked role reference.
        VivCompileError: Loop variable name shadows a role name.
    """
    if construct_definition['type'] == external_types.ConstructDiscriminator.ACTION:
        construct_role_names = get_all_action_role_names(action_definition=construct_definition)
    else:
        construct_role_names = set(construct_definition['roles'])
    all_loop_expressions: list[external_types.Loop] = utils.get_all_expressions_of_type(
        expression_type=external_types.ExpressionDiscriminator.LOOP,
        ast_chunk=construct_definition
    )
    for loop_expression in all_loop_expressions:
        loop: external_types.LoopValue = loop_expression['value']
        loop_source = loop_expression['source']
        # Detect attempts to loop over single-entity role references, i.e., ones using `@role` notation
        # without a group-role decorator (`@role*`) or a path (`@role.path.to.collection`). Of course,
        # the path could point to a non-iterable value, but that's a runtime issue that depends on the
        # domain of the host application, so there's nothing we can do to detect that kind of issue here.
        if loop['iterable']['type'] == external_types.ExpressionDiscriminator.ENTITY_REFERENCE:
            if not loop['iterable']['value']['group'] and not loop['iterable']['value']['path']:
                role_name = loop['iterable']['value']['anchor']
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                    f"'{construct_definition['name']}' attempts to loop over a non-unpacked role: '{role_name}' "
                    f"(perhaps use * here)",
                    source=loop_source
                )
        # Detect cases of a loop variable shadowing the name of a role from the same action
        if loop['variable']['name'] in construct_role_names:
            raise errors.VivCompileError(
                f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                f"'{construct_definition['name']}' has loop with variable name that shadows role name "
                f"'{loop['variable']['name']}' (this is prohibited)",
                source=loop_source
            )


def _validate_assignments(*, construct_definition: external_types.ConstructDefinition) -> None:
    """Validate the given construct definition's usage of assignments.

    Args:
        construct_definition: A construct definition in a compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: Assignment in a non-action construct type.
        VivCompileError: Assignment housed in a field that does not permit assignments.
        VivCompileError: Assignment sets a local variable outside a loop or header.
        VivCompileError: Assignment recasts a role.
        VivCompileError: Assignment targets a symbol role.
        VivCompileError: Assignment LHS has a trailing fail-safe marker.
    """
    # Collect all assignments
    all_assignments: list[external_types.Assignment] = utils.get_all_expressions_of_type(
        expression_type=external_types.ExpressionDiscriminator.ASSIGNMENT,
        ast_chunk=construct_definition
    )
    # If this is not an action, ensure that there are no assignments whatsoever
    if construct_definition["type"] != external_types.ConstructDiscriminator.ACTION:
        if all_assignments:
            error_message = (
                f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                f"'{construct_definition['name']}' contains an assignment (only permitted in actions)"
            )
            raise errors.VivCompileError(error_message, source=all_assignments[0]['source'])
        return
    # Make sure that all assignments are housed in the proper fields
    for field_name, field_value in construct_definition.items():
        if field_name not in config.ACTION_FIELDS_PERMITTING_ASSIGNMENTS:
            assignments_in_field: list[external_types.Assignment] = utils.get_all_expressions_of_type(
                expression_type=external_types.ExpressionDiscriminator.ASSIGNMENT,
                ast_chunk=field_value
            )
            if assignments_in_field:
                error_message = (
                    f"Action '{construct_definition['name']}' has assignment in '{field_name}' field "
                    f"(only allowed in {', '.join(config.ACTION_FIELDS_PERMITTING_ASSIGNMENTS)})"
                )
                raise errors.VivCompileError(error_message, source=assignments_in_field[0]["source"])
    # Validate each assignment in turn
    for assignment_expression in all_assignments:
        assignment: external_types.AssignmentValue = assignment_expression['value']
        assignment_source = assignment_expression['source']
        assignment_lhs: external_types.ReferenceValue = assignment['left']['value']
        anchor = assignment_lhs['anchor']
        path = assignment_lhs['path']
        # Detect attempts to set a local variable. Note that we do allow assignments that are anchored
        # in local variables and also have a path, since this enables the common pattern of looping
        # over a group role to execute effects for each entity cast in the group role.
        if assignment['left']['value']['local'] and not path:
            raise errors.VivCompileError(
                f"Assignment expression in action '{construct_definition['name']}' sets local variable '{anchor}', "
                f"but local variables can only be set in loops, 'saliences' headers, and 'associations' headers",
                source=assignment_source
            )
        if anchor != config.ACTION_SELF_REFERENCE_ROLE_NAME and anchor in construct_definition['roles']:
            # Detect attempts to recast a role via assignment (not allowed)
            if not path:
                raise errors.VivCompileError(
                    f"Assignment expression in action '{construct_definition['name']}' recasts "
                    f"role '{anchor}' (this is prohibited)",
                    source=assignment_source
                )
            # Detect attempts to set data on a complex symbol role (currently prohibited)
            anchor_role_definition = construct_definition['roles'][anchor]
            if anchor_role_definition['entityType'] == external_types.RoleEntityType.SYMBOL:
                raise errors.VivCompileError(
                    f"Assignment expression in action '{construct_definition['name']}' has "
                    f"symbol role on its left-hand side (this is currently prohibited): '{anchor}'",
                    source=assignment_source
                )
        # Detect a trailing eval fail-safe marker, which is bizarre and probably an authoring error
        if path and path[-1]['failSafe']:
            raise errors.VivCompileError(
                f"LHS of assignment expression in action '{construct_definition['name']}' has "
                f"a trailing eval fail-safe marker '?' (only allowed within, and not following, the LHS)",
                source=assignment_source
            )


def _validate_scratch_variable_usage(*, construct_definition: external_types.ConstructDefinition) -> None:
    """Validate the given construct definition's usage of scratch variables.

    This procedure ensures that any scratch variable that is referenced is assigned *somewhere* in
    the construct definition, but it does not ensure that the variable is assigned before it's used.

    Args:
        construct_definition: A construct definition in a compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: Scratch variable used in a non-action construct type.
        VivCompileError: Scratch variable referenced but never assigned.
    """
    # Retrieve the names of all scratch variables that are set anywhere in the construct definition
    all_assigned_scratch_variable_names = set(get_all_assigned_scratch_variable_names(ast_chunk=construct_definition))
    # Retrieve the names of all scratch variables that are referenced anywhere in the action definition
    all_referenced_scratch_variable_names = set(get_all_referenced_scratch_variable_names(
        ast_chunk=construct_definition
    ))
    # If this is not an action, ensure that there is no usage of scratch variables whatsoever
    if construct_definition["type"] != external_types.ConstructDiscriminator.ACTION:
        if all_assigned_scratch_variable_names or all_referenced_scratch_variable_names:
            raise errors.VivCompileError(
                f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                f"'{construct_definition['name']}' makes use of scratch variables (only permitted in actions)"
            )
        return
    # Flag any cases of a scratch variable being referenced without being assigned anywhere
    referenced_but_not_assigned = all_referenced_scratch_variable_names - all_assigned_scratch_variable_names
    if referenced_but_not_assigned:
        snippet = "'" + "', '".join(sorted(referenced_but_not_assigned)) + "'"
        raise errors.VivCompileError(
            f"Action '{construct_definition['name']}' references the following scratch variables without ever "
            f"assigning them: {snippet}"
        )


def _validate_search_domain_declaration(
    *,
    construct_definition: external_types.ConstructDefinition,
    search_domain_declaration: external_types.SearchDomainDeclaration,
    in_sifting: bool,
    source: external_types.SourceAnnotations | None = None
) -> None:
    """Validates the given search-domain declaration.

    Args:
        construct_definition: Definition for the construct containing the search-domain declaration.
        search_domain_declaration: The search-domain declaration to validate.
        in_sifting: Whether the search is part of a sifting, as opposed to an action search.
        source: Source annotations for the expression containing the search-domain declaration.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: Unexpected construct type (defensive).
        VivCompileError: Search-domain declaration uses a prohibited preparation policy.
    """
    match construct_definition['type']:
        case external_types.ConstructDiscriminator.ACTION:
            prohibited_policy = external_types.SearchDomainPreparationPolicy.INHERIT
        case external_types.ConstructDiscriminator.ACTION_SELECTOR:
            prohibited_policy = external_types.SearchDomainPreparationPolicy.INHERIT
        case external_types.ConstructDiscriminator.PLAN:
            prohibited_policy = external_types.SearchDomainPreparationPolicy.INHERIT
        case external_types.ConstructDiscriminator.PLAN_SELECTOR:
            prohibited_policy = external_types.SearchDomainPreparationPolicy.INHERIT
        case external_types.ConstructDiscriminator.QUERY:
            prohibited_policy = external_types.SearchDomainPreparationPolicy.CHRONICLE
        case external_types.ConstructDiscriminator.SIFTING_PATTERN:
            prohibited_policy = external_types.SearchDomainPreparationPolicy.CHRONICLE
        case external_types.ConstructDiscriminator.TROPE:
            # A trope works with any policy, though there is the chance of a discrepancy at runtime,
            # if a trope fit occurs in a complex expression sequence and does not specify the right
            # search-domain preparation policy. This will be flagged if it occurs.
            return
        case _:
            raise errors.VivCompileError(
                f"Unexpected construct type: {construct_definition['type']}",
                source=source
            )
    if search_domain_declaration['policy'] == prohibited_policy:
        context_snippet = "sifting" if in_sifting else "action search"
        raise errors.VivCompileError(
            f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
            f"uses 'over: {prohibited_policy.upper()}' in a {context_snippet} (prohibited for this construct type)",
            source=source
        )


def _validate_negated_expressions(*, construct_definition: external_types.ConstructDefinition) -> None:
    """Validate the given construct definition's usage of expression negation.

    Args:
        construct_definition: A construct definition in a compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: The construct definition negates an expression that cannot be negated.
    """
    for negated_expression in get_all_negated_expressions(ast_chunk=construct_definition):
        if negated_expression['type'] not in config.NEGATABLE_EXPRESSION_TYPES:
            raise errors.VivCompileError(
                f"Expression of type '{negated_expression['type']}' in "
                f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                f"'{construct_definition['name']}' is negated, but this is not allowed (only the following "
                f"expression types support negation: {', '.join(config.NEGATABLE_EXPRESSION_TYPES)}):\n\n"
                f"{negated_expression}",
                source=negated_expression.get('source')
            )


def _validate_chance_expressions(*, construct_definition: external_types.ConstructDefinition) -> None:
    """Validate the given construct definition's usage of chance expressions.

    Args:
        construct_definition: A construct definition in a compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: The construct definition has an invalid chance expression.
    """
    all_chance_expressions: list[external_types.ChanceExpression] = utils.get_all_expressions_of_type(
        expression_type=external_types.ExpressionDiscriminator.CHANCE_EXPRESSION,
        ast_chunk=construct_definition
    )
    for chance_expression in all_chance_expressions:
        chance_value: float = chance_expression['value']
        chance_source = chance_expression['source']
        if chance_value < 0.0 or chance_value > 1.0:
            raise errors.VivCompileError(
                f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                f"'{construct_definition['name']}' has chance expression with chance value outside of "
                f"the range [0, 100]: '{chance_value * 100}%'",
                source=chance_source
            )
