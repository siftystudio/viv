"""Handles preliminary validation of certain aspects of intermediate construct definitions,
to support phases of postprocessing that rely on those aspects being well-formed.
"""

__all__ = [
    "prevalidate_role_names",
    "prevalidate_construct_names",
    "prevalidate_action_inheritance",
    "prevalidate_initiator_roles",
    "prevalidate_roles",
    "prevalidate_action_selectors"
]

from viv_compiler import config, errors, external_types, internal_types, sentinels, utils
from ._utils import detect_cycle_in_graph


def prevalidate_role_names(
    *,
    construct_type: external_types.ConstructDiscriminator,
    construct_name: str,
    role_definitions: list[external_types.RoleDefinition],
    source: external_types.SourceAnnotations | None = None
) -> None:
    """Ensure that there are no duplicate names among the given role definitions for the given construct.

    Args:
        construct_type: The type of construct associated with these roles.
        construct_name: The name of the construct associated with these roles.
        role_definitions: The role definitions to check for duplicates.
        source: If applicable, source annotations for the construct.

    Returns:
        None.

    Raises:
        VivCompileError: A duplicate name was detected among the given role definitions.
    """
    for role_definition in role_definitions:
        n_roles_with_that_name = 0
        for other_role_definition in role_definitions:
            if other_role_definition['name'] == role_definition["name"]:
                n_roles_with_that_name += 1
                if n_roles_with_that_name > 1:
                    raise errors.VivCompileError(
                        f"{utils.CONSTRUCT_LABEL[construct_type]} '{construct_name}' "
                        f"has duplicate role: '{role_definition['name']}'",
                        source=source
                    )


def prevalidate_construct_names(*, combined_ast: internal_types.CombinedAST) -> None:
    """Ensure that there are no duplicate names among the units in the given combined AST.

    More specifically, there must not be a duplicate name *within* a unit type. For example,
    there may not be two actions with the same name, but it's fine for an action and a trope
    to share the same name.

    Args:
        combined_ast: An abstract syntax tree produced by the Visitor class, integrating the
            respective ASTs of any included files.

    Returns:
        None.

    Raises:
        VivCompileError: Duplicate action name.
        VivCompileError: Duplicate action-selector name.
        VivCompileError: Duplicate plan name.
        VivCompileError: Duplicate plan-selector name.
        VivCompileError: Duplicate query name.
        VivCompileError: Duplicate sifting-pattern name.
        VivCompileError: Duplicate trope name.
    """
    # Detect duplicate action names
    action_names = [action_definition['name'] for action_definition in combined_ast['actions']]
    for action_name in action_names:
        if action_names.count(action_name) > 1:
            raise errors.VivCompileError(f"Duplicate action name: '{action_name}'")
    # Detect duplicate action-selector names
    action_selector_names = [selector_definition['name'] for selector_definition in combined_ast['actionSelectors']]
    for action_selector_name in action_selector_names:
        if action_selector_names.count(action_selector_name) > 1:
            raise errors.VivCompileError(f"Duplicate action-selector name: '{action_selector_name}'")
    # Detect duplicate plan names
    plan_names = [plan_definition['name'] for plan_definition in combined_ast['plans']]
    for plan_name in plan_names:
        if plan_names.count(plan_name) > 1:
            raise errors.VivCompileError(f"Duplicate plan name: '{plan_name}'")
    # Detect duplicate plan-selector names
    plan_selector_names = [selector_definition['name'] for selector_definition in combined_ast['planSelectors']]
    for plan_selector_name in plan_selector_names:
        if plan_selector_names.count(plan_selector_name) > 1:
            raise errors.VivCompileError(f"Duplicate plan-selector name: '{plan_selector_name}'")
    # Detect duplicate query names
    query_names = [query_definition['name'] for query_definition in combined_ast['queries']]
    for query_name in query_names:
        if query_names.count(query_name) > 1:
            raise errors.VivCompileError(f"Duplicate query name: '{query_name}'")
    # Detect duplicate sifting-pattern names
    sifting_pattern_names = [pattern_definition['name'] for pattern_definition in combined_ast['siftingPatterns']]
    for sifting_pattern_name in sifting_pattern_names:
        if sifting_pattern_names.count(sifting_pattern_name) > 1:
            raise errors.VivCompileError(f"Duplicate sifting-pattern name: '{sifting_pattern_name}'")
    # Detect duplicate trope names
    trope_names = [trope_definition['name'] for trope_definition in combined_ast['tropes']]
    for trope_name in trope_names:
        if trope_names.count(trope_name) > 1:
            raise errors.VivCompileError(f"Duplicate trope name: '{trope_name}'")


def prevalidate_action_inheritance(*, combined_ast: internal_types.CombinedAST) -> None:
    """Ensure that action definitions only use inheritance fields when a parent action is specified.

    Note: By this point, we have already ensured that the `join` operator is only used in actions
    declaring a parent. We need to do this in the visitor, because that data is transient.

    If this validation check passes, the given combined AST is ready for inheritance to be handled.

    Args:
        combined_ast: An abstract syntax tree produced by the Visitor class, integrating the
            respective ASTs of any included files.

    Returns:
        None.

    Raises:
        VivCompileError: Action renames role without parent.
        VivCompileError: Action uses role renaming without 'join roles'.
    """
    for action_definition in combined_ast["actions"]:
        role_definitions = action_definition.get('roles', {}).values()
        for role_definition in role_definitions:
            if role_definition["renames"]:
                if not action_definition["parent"]:
                    raise errors.VivCompileError(
                        f"Action '{action_definition['name']}' renames a role but declares no parent"
                    )
                if sentinels.CHILD_JOIN_DIRECTIVE_ROLES not in action_definition.get("_join_directives", []):
                    raise errors.VivCompileError(
                        f"Action '{action_definition['name']}' uses role renaming but does not 'join roles'"
                    )


def prevalidate_initiator_roles(*, combined_ast: internal_types.CombinedAST) -> None:
    """Ensure that each of the action and selector definitions in the given AST
    has a single initiator role with no casting pool.

    Args:
        combined_ast: An abstract syntax tree produced by the Visitor class, integrating the
            respective ASTs of any included files.

    Returns:
        None.

    Raises:
        VivCompileError: Construct has no initiator role.
        VivCompileError: Construct has multiple initiator roles.
        VivCompileError: Initiator role has casting-pool directive.
    """
    for construct_definition in utils.get_all_construct_definitions(combined_ast=combined_ast):
        if construct_definition['type'] not in config.CONSTRUCT_TYPES_USING_INITIATOR_ROLES:
            continue
        # Make sure there is exactly one initiator role
        all_initiator_roles = [
            role for role in construct_definition['roles'].values() if utils.is_initiator_role(role_definition=role)
        ]
        if len(all_initiator_roles) == 0:
            raise errors.VivCompileError(
                f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                f"'{construct_definition['name']}' has no initiator role (must have exactly one)"
            )
        elif len(all_initiator_roles) > 1:
            raise errors.VivCompileError(
                f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                f"'{construct_definition['name']}' has multiple initiator roles (must have exactly one)"
            )
        # Make sure the initiator role does not have a casting-pool directive. We prohibit
        # this because the initiator role is always cast first.
        initiator_role_definition = all_initiator_roles[0]
        if initiator_role_definition['pool']:
            raise errors.VivCompileError(
                f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                f"'{construct_definition['name']}' has initiator role '{initiator_role_definition['name']}' "
                f"with a casting-pool directive, which is not allowed for initiator roles"
            )


def prevalidate_roles(*, combined_ast: internal_types.CombinedAST) -> None:
    """Detect any issues that would preclude the construction of role-dependency forests
    for the constructs in the given combined AST.

    Args:
        combined_ast: A combined AST with wrapped expressions and actions that have the `initiator` field set.

    Returns:
        None.

    Raises:
        VivCompileError: At least one construct definition did not pass validation.
    """
    for construct_definition in utils.get_all_construct_definitions(combined_ast=combined_ast):
        # Detect any reference to an undefined role. This validation *must* occur prior
        # to condition attribution and construction of the role-dependency forest.
        _detect_reference_to_undefined_role(construct_definition=construct_definition)
        # Detect cases of a casting pool referencing an optional role
        _detect_casting_pool_optional_role_anchor(construct_definition=construct_definition)
        # Detect cycles across the casting pools for the construct roles
        _detect_casting_pool_cycle(construct_definition=construct_definition)
        # Detect cases of a casting pool referencing a special role (`@this`, `@hearer`)
        _detect_special_role_in_casting_pool(construct_definition=construct_definition)
        # Detect cases of a condition referencing a special role (`@this`, `@hearer`)
        _detect_special_role_in_conditions(construct_definition=construct_definition)
        # Detect cases of a condition referencing multiple optional roles
        _detect_condition_referencing_multiple_optional_roles(construct_definition=construct_definition)


def _detect_reference_to_undefined_role(
    *,
    construct_definition: internal_types.IntermediateConstructDefinition
) -> None:
    """Ensure that the given construct definition has no references to any undefined role.

    Args:
        construct_definition: An intermediate construct definition.

    Returns:
        None.

    Raises:
        VivCompileError: A reference to an undefined role was detected.
    """
    field_label = {field_name: field_name for field_name in construct_definition}
    field_label["_conditions_raw"] = "conditions"
    field_label["_effects_raw"] = "effects"
    field_label["_reactions_raw"] = "reactions"
    for field_name, field_value in construct_definition.items():
        for role_name in utils.get_all_referenced_roles(ast_chunk=field_value):
            if role_name not in set(construct_definition['roles']) | config.SPECIAL_ROLE_NAMES:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
                    f"references undefined role '{role_name}' in '{field_label[field_name]}' field"
                )


def _detect_special_role_in_casting_pool(
    *, construct_definition: internal_types.IntermediateConstructDefinition
) -> None:
    """Ensure that the given construct definition has no references to special roles in any casting pool.

    Special roles like `@this` and `@hearer` are not available during role casting, since at
    that time the action has yet to be performed, meaning those concepts don't exist yet.

    Args:
        construct_definition: An intermediate construct definition.

    Returns:
        None.

    Raises:
        VivCompileError: A special role was referenced in a casting pool.
    """
    for role_definition in construct_definition['roles'].values():
        if not role_definition['pool']:
            continue
        all_entity_references: list[external_types.EntityReference] = utils.get_all_expressions_of_type(
            expression_type=external_types.ExpressionDiscriminator.ENTITY_REFERENCE,
            ast_chunk=role_definition['pool']
        )
        for entity_reference in all_entity_references:
            if entity_reference['value']['anchor'] in config.SPECIAL_ROLE_NAMES:
                if not entity_reference['value']['local']:
                    raise errors.VivCompileError(
                        f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
                        f"references special role '@{entity_reference['value']['anchor']}' in casting pool for "
                        f"role '{role_definition['name']}' "
                        f"(special roles are not available during role casting)"
                    )


def _detect_special_role_in_conditions(*, construct_definition: internal_types.IntermediateConstructDefinition) -> None:
    """Ensure that the given construct definition has no references to special roles in its conditions.

    Special roles like `@this` and `@hearer` are not available during condition evaluation, since
    at that time the action has yet to be performed, meaning those concepts don't exist yet.

    Args:
        construct_definition: An intermediate construct definition.

    Returns:
        None.

    Raises:
        VivCompileError: A special role was referenced in a condition.
    """
    all_entity_references: list[external_types.EntityReference] = utils.get_all_expressions_of_type(
        expression_type=external_types.ExpressionDiscriminator.ENTITY_REFERENCE,
        ast_chunk=construct_definition["_conditions_raw"]
    )
    for entity_reference in all_entity_references:
        if not entity_reference['value']['local'] and entity_reference['value']['anchor'] in config.SPECIAL_ROLE_NAMES:
            raise errors.VivCompileError(
                f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
                f"references special role '@{entity_reference['value']['anchor']}' in 'conditions' field "
                f"(special roles are not available during condition evaluation)"
            )


def _detect_casting_pool_optional_role_anchor(
    *, construct_definition: internal_types.IntermediateConstructDefinition
) -> None:
    """Throws an error if any casting-pool directive in the given construct's roles is anchored in an optional role.

    Args:
        construct_definition: An intermediate construct definition. If it's an action, the `initiator`
            field must be present.

    Returns:
        None. Only returns if no pool is anchored in an optional role.

    Raises:
        VivCompileError: If a pool is anchored in an optional role.
    """
    optional_role_names = {role['name'] for role in construct_definition['roles'].values() if role['min'] == 0}
    for role_definition in construct_definition['roles'].values():
        if role_definition['pool']:
            for anchor_role_name in utils.get_all_referenced_roles(ast_chunk=role_definition["pool"]):
                if anchor_role_name in optional_role_names:
                    raise errors.VivCompileError(
                        f"Casting-pool directive for role '{role_definition['name']}' in "
                        f"{utils.CONSTRUCT_LABEL[construct_definition['type']].lower()} "
                        f"'{construct_definition['name']}' references an optional role "
                        f"in its casting-pool directive: '{anchor_role_name}'"
                    )


def _detect_casting_pool_cycle(*, construct_definition: internal_types.IntermediateConstructDefinition) -> None:
    """Throws an error if the casting-pool directives for the given action's roles form a cycle.

    Args:
        construct_definition: An intermediate action definition whose 'initiator' field has already been set.

    Returns:
        None. Only returns if there's no cycle.

    Raises:
        VivCompileError: Role references itself in pool.
        VivCompileError: Cycle among pool anchors.
    """
    # Build adjacency graph
    required_non_initiator_roles = [
        role for role in construct_definition['roles'].values()
        if role['min'] > 0 and not utils.is_initiator_role(role_definition=role)
    ]
    required_non_initiator_role_names = {role['name'] for role in required_non_initiator_roles}
    adjacency_graph = {role['name']: set() for role in required_non_initiator_roles}
    for role in required_non_initiator_roles:
        if role['pool']:
            for anchor_role_name in utils.get_all_referenced_roles(ast_chunk=role["pool"]):
                if anchor_role_name == role['name']:
                    raise errors.VivCompileError(
                        f"Role '{role['name']}' in "
                        f"{utils.CONSTRUCT_LABEL[construct_definition['type']].lower()} "
                        f"'{construct_definition['name']}' references itself in its casting-pool directive "
                        f"(prohibited because it cannot be cast without first being cast)"
                    )
                if anchor_role_name in required_non_initiator_role_names:
                    adjacency_graph[anchor_role_name].add(role['name'])
    # Attempt to detect a cycle
    cycle = detect_cycle_in_graph(adjacency_graph=adjacency_graph)
    if cycle:
        cycle_str = "'" + "' > '".join(cycle) + "'"
        raise errors.VivCompileError(
            f"Cycle detected among casting-pool anchors in "
            f"{utils.CONSTRUCT_LABEL[construct_definition['type']].lower()} "
            f"'{construct_definition['name']}': {cycle_str} "
            f"(prohibited because such a cycle can never be resolved)"
        )


def _detect_condition_referencing_multiple_optional_roles(
    *, construct_definition: internal_types.IntermediateConstructDefinition
) -> None:
    """Ensure that none of the given construct definition's conditions references multiple optional roles.

    We prohibit this because optional roles are cast one at a time, with no backtracking. As such, it's
    currently not possible to evaluate a condition referencing two optional roles, since that would require
    considering the combinatorial space of their respective candidates, which entails backtracking.

    Args:
        construct_definition: An intermediate construct definition.

    Returns:
        None.

    Raises:
        VivCompileError: One or more of the given construct definition's conditions references multiple optional roles.
    """
    for condition in construct_definition['_conditions_raw']:
        optional_role_references = []
        for reference in condition['references']:
            if construct_definition['roles'][reference]['min'] < 1:
                optional_role_references.append(reference)
            if len(optional_role_references) > 1:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                    f"'{construct_definition['name']}' has condition that references multiple optional "
                    f"roles ({', '.join(optional_role_references)}), but currently a condition may only "
                    f"reference at most one optional role"
                )


def prevalidate_action_selectors(*, combined_ast: internal_types.CombinedAST) -> None:
    """Prevalidate all action selectors.

    Args:
        combined_ast: A combined AST as produced by inheritance processing.

    Returns:
        None.
    """
    for action_selector_definition in combined_ast["actionSelectors"]:
        _detect_missing_action_selector_initiator(action_selector_definition=action_selector_definition)
        _detect_undefined_action_selector_candidate(
            action_selector_definition=action_selector_definition,
            combined_ast=combined_ast
        )
    _detect_action_selector_candidate_cycle(combined_ast=combined_ast)


def _detect_missing_action_selector_initiator(
        *, action_selector_definition: internal_types.IntermediateActionSelectorDefinition
) -> None:
    """Ensure that the given action selector has a valid (potentially implicit) initiator role.

    Args:
        action_selector_definition: An intermediate action-selector definition.

    Returns:
        None.

    Raises:
        VivCompileError: The action selector defines a `roles` field, but does not specify an initiator role.
    """
    if action_selector_definition["roles"]:
        role_definitions = action_selector_definition["roles"].values()
        if not any(utils.is_initiator_role(role_definition=role) for role in role_definitions):
            raise errors.VivCompileError(
                f"Action selector '{action_selector_definition['name']}' has a 'roles' field, "
                f"but fails to specify an initiator"
            )


def _detect_undefined_action_selector_candidate(
    *,
    action_selector_definition: internal_types.IntermediateActionSelectorDefinition,
    combined_ast: internal_types.CombinedAST
) -> None:
    """Ensure that all the given action selector's candidates are defined actions and/or action selectors.

    Args:
        action_selector_definition: An intermediate action-selector definition.
        combined_ast: A combined AST as produced by inheritance processing.

    Returns:
        None.

    Raises:
        VivCompileError: Action selector targets undefined action selector.
        VivCompileError: Action selector targets undefined action.
    """
    for candidate in action_selector_definition["candidates"]:
        if candidate["isSelector"]:
            if not any(selector['name'] == candidate['name'] for selector in combined_ast["actionSelectors"]):
                raise errors.VivCompileError(
                    f"Action selector '{action_selector_definition['name']}' targets undefined "
                    f"action selector: '{candidate['name']}'"
                )
        elif not any(action['name'] == candidate['name'] for action in combined_ast["actions"]):
            raise errors.VivCompileError(
                f"Action selector '{action_selector_definition['name']}' targets "
                f"undefined action: '{candidate['name']}'"
            )


def _detect_action_selector_candidate_cycle(*, combined_ast: internal_types.CombinedAST) -> None:
    """Throws an error if there is a cycle among the action-selector definitions in the given combined AST.

    A selector can yield a cycle when it targets itself, or when it targets another selector
    that directly or indirectly ends up targeting the original selector.

    Args:
        combined_ast: A combined AST as produced by inheritance processing.

    Returns:
        None. Only returns if there's no cycle.

    Raises:
        VivCompileError: Action selector targets itself.
        VivCompileError: Cycle among action selectors.
    """
    # Build adjacency graph
    adjacency_graph = {selector_definition['name']: set() for selector_definition in combined_ast["actionSelectors"]}
    for selector_definition in combined_ast["actionSelectors"]:
        for candidate in selector_definition["candidates"]:
            if candidate["isSelector"]:
                if candidate["name"] == selector_definition["name"]:
                    raise errors.VivCompileError(
                        f"Action selector '{selector_definition['name']}' directly targets itself "
                        f"(prohibited because it would yield an infinite loop during targeting)"
                    )
                adjacency_graph[selector_definition['name']].add(candidate["name"])
    # Attempt to select an indirect cycle
    cycle = detect_cycle_in_graph(adjacency_graph=adjacency_graph)
    if cycle:
        cycle_str = "'" + "' > '".join(cycle) + "'"
        raise errors.VivCompileError(
            f"Cycle detected among action selectors: {cycle_str} "
            f"(prohibited because such cycles make selector targeting impossible to resolve)"
        )
