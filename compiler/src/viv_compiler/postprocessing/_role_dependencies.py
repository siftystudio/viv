"""Handles the construction of role-dependency forests.

These forests will be used at runtime to structure role casting during construct targeting,
where it drives an optimized procedure that helps to prune the space of possible casts
and thereby significantly reduce the degree to which conditions are tested.
"""

__all__ = ["build_role_dependency_forests", "build_condition_groups"]

from viv_compiler import external_types, internal_types, utils, validation


def build_role_dependency_forests(*, combined_ast: internal_types.CombinedAST) -> None:
    """Construct and attribute a role-dependency forest for each construct in the given combined AST.

    The trees constituting the forests constructed by this function will be defined by setting the `parent`
    and `children` fields in the applicable role definitions. Dependency forests are used at runtime to
    structure role casting during construct targeting. Edges represent dependency from two sources:

        1) The child role's pool directive references the parent role, which means the latter
           must be cast first. This is a strict dependency.

        2) The child role shares one or more conditions with the parent role and/or its ancestors
           in the tree (as constructed to that point). This is not a strict dependency, but rather
           one that enables significant optimizations.

    A role-dependency forest is composed of one or more role-dependency trees. Within a given tree are
    one or more roles structured such that each child depends on its parent role. If there are multiple
    trees for a given construct, the roles in the respective trees are strictly independent of one another,
    in terms of the two forms of dependency enumerated above.

    During construct targeting, role casting iterates over each dependency tree in the construct's forest,
    traversing each in a depth-first manner, with backtracking working in the inverse direction. This allows
    for sequential role casting and also greatly reduces the frequency of re-evaluating conditions unnecessarily,
    since backtracking will not revisit roles with no dependency relation to the one for which casting failed.

    Finally, note that this tree does not contain optional roles (ones with a `min` of `0`) because they
    are always cast last, after all required roles have been cast, in a manner that does not entail
    backtracking. Further, by the time we get here, we have already confirmed that no casting-pool
    declarations reference an optional role, so no role can strictly depend on an optional role.

    Args:
        combined_ast: A combined AST with wrapped expressions and actions that have the `initiator` field set.

    Returns:
        None (modifies the construct definitions in place).
    """
    # Conduct preliminary validation of the roles in the current intermediate construct
    # definitions, to catch any issues that would preclude construction of the forests.
    validation.prevalidate_roles(combined_ast=combined_ast)
    # If that passes, we can construct a forest for each construct definition in turn
    for construct_definition in utils.get_all_construct_definitions(combined_ast=combined_ast):
        # Isolate the required roles, since only these can serve as nodes in the forest
        required_roles = [role for role in construct_definition['roles'].values() if role['min'] > 0]
        # Handle dependency relations that are rooted in casting-pool directives
        _handle_casting_pool_dependencies(construct_definition=construct_definition, required_roles=required_roles)
        # Handle dependency relations rooted in shared conditions
        _handle_condition_dependencies(construct_definition=construct_definition, required_roles=required_roles)
        # Finally, organize the dependency forest we have constructed
        _organize_dependency_forest(construct_definition=construct_definition, required_roles=required_roles)


def _handle_casting_pool_dependencies(
    *,
    construct_definition: internal_types.IntermediateConstructDefinition,
    required_roles: list[external_types.RoleDefinition]
) -> None:
    """Modify the given construct definition in place to attribute dependency relations among
    its roles that are rooted in their respective casting-pool directives.

    If a given role R1 references a single other role R2 in its casting-pool directive, R1 will be specified
    as a child of the 'anchor role' R2, in the dependency tree. If there are multiple such anchor roles for R1,
    only one of them will become R1's parent, but all of them will be ancestors.

    Note that by this point, we will have already caught cases of the following:
        - A cycle among the casting-pool directives.
        - A casting-pool directive anchored in an optional role.
        - An initiator role with a casting pool.

    Args:
        construct_definition: An intermediate construct definition.
        required_roles: A list containing definitions for all required roles in the given construct definition.

    Returns:
        None (modifies the construct definition in place).
    """
    for role_definition in required_roles:
        if not role_definition['pool']:
            continue
        anchor_role_names = utils.get_all_referenced_roles(ast_chunk=role_definition['pool'])
        if construct_definition['type'] == external_types.ConstructDiscriminator.ACTION:
            # If this is an action, we want to ensure that the initiator always dominates, which
            # can be accomplished by placing them last here. This works because we iterate over
            # the anchor role names in order, reattaching to each in turn.
            anchor_role_names.sort(key=lambda role_name: role_name == construct_definition['initiator'])
        for anchor_role_name in anchor_role_names:
            _reattach_subtree(
                construct_definition=construct_definition,
                reattachment_target_role_name=anchor_role_name,
                reattachment_source_role_name=role_definition['name']
            )


def _handle_condition_dependencies(
    *,
    construct_definition: internal_types.IntermediateConstructDefinition,
    required_roles: list[external_types.RoleDefinition]
) -> None:
    """Modify the given construct definition in place to attribute dependency relations among
    its roles that are rooted in shared conditions.

    Args:
        construct_definition: An intermediate construct definition with wrapped expressions. If it's an
             action, it must also have the `initiator` field set.
        required_roles: A list containing definitions for all required roles in the given construct definition.

    Returns:
        None (modifies the construct definition in place).
    """
    # Compile all cases of roles sharing conditions
    role_name_to_role_names_sharing_conditions = {role['name']: set() for role in required_roles}
    for condition in construct_definition["_conditions_raw"]:
        if any(construct_definition['roles'][role_name]['min'] == 0 for role_name in condition['references']):
            # Skip any condition that references an optional role
            continue
        for condition_role_name in condition["references"]:
            for other_condition_role_name in condition["references"]:
                if condition_role_name == other_condition_role_name:
                    continue
                role_name_to_role_names_sharing_conditions[condition_role_name].add(other_condition_role_name)
    # For each role R, retrieve each other role S with which R shares one or more conditions. If S is not
    # a lineal relative of R, we will reattach under either R or S a subtree containing the other.
    role_definition_order = {role_name: i for i, role_name in enumerate(construct_definition['roles'])}
    for role_definition in required_roles:
        role_name = role_definition['name']
        for other_role_name in role_name_to_role_names_sharing_conditions[role_name]:
            if role_definition_order[other_role_name] < role_definition_order[role_name]:
                # The function `_linearize_condition_dependency()`, which we call below, requires that the
                # two roles be passed to certain parameters depending on which one was defined first by the
                # author. This is because we use definition order as a heuristic. The `role_definition_order`
                # mapping works because the keys in the `roles` field always appear in the author-defined
                # order (note that dictionary keys have been ordered since Python 3.7).
                continue
            role_ancestors = _get_ancestors(construct_definition=construct_definition, role_name=role_name)
            role_descendants = _get_descendants(construct_definition=construct_definition, role_name=role_name)
            if other_role_name in role_ancestors or other_role_name in role_descendants:
                continue
            # Linearize the dependency
            reattachment_target_role_name, reattachment_source_role_name = _linearize_condition_dependency(
                construct_definition=construct_definition,
                role_name=role_name,
                other_role_name=other_role_name
            )
            # Update the tree to reflect the linearized dependency
            _reattach_subtree(
                construct_definition=construct_definition,
                reattachment_target_role_name=reattachment_target_role_name,
                reattachment_source_role_name=reattachment_source_role_name
            )


def _linearize_condition_dependency(
    *,
    construct_definition: internal_types.IntermediateConstructDefinition,
    role_name: external_types.RoleName,
    other_role_name: external_types.RoleName
) -> tuple[external_types.RoleName, external_types.RoleName]:
    """Linearize the mutual condition dependency between the given roles.

    The given roles share a condition, which is a mutual dependency that we need to linearize,
    because we are building a tree. Since this is a mutual dependency, we could reasonably go in
    either direction, but for optimization purposes we will use three heuristics:

    1. The initiator dominates. We want them to be the root of their tree always.

    2. Otherwise, the role with the fewest ancestors wins.

    3. If there is a tie, the role defined first will win. Authors tend to write roles in decreasing
       order of importance, and more important roles tend to depend less on other roles, which makes
       for a good heuristic here.

    Args:
        role_name: The name of the role defined earlier in the construct definition.
        other_role_name: The name of the role defined later in the construct definition.

    Returns:
        A tuple containing, in order, the ancestor and the descendant in the linearized dependency.
    """
    # If this is an action, isolate the initiator role name, which is needed below
    initiator_name = None
    if construct_definition['type'] == external_types.ConstructDiscriminator.ACTION:
        initiator_name = construct_definition['initiator']
    # To break a potential tie, per heuristic #3 above, we'll declare as the winner
    # the role that was defined first, until proven otherwise.
    linearized_dependency_ancestor = role_name
    if initiator_name and role_name == initiator_name:
        linearized_dependency_ancestor = role_name
    elif initiator_name and other_role_name == initiator_name:
        linearized_dependency_ancestor = other_role_name
    else:
        role_ancestors = _get_ancestors(construct_definition=construct_definition, role_name=role_name)
        other_role_ancestors = _get_ancestors(construct_definition=construct_definition, role_name=other_role_name)
        if len(other_role_ancestors) < len(role_ancestors):  # Strictly fewer, so we can break ties per heuristic #3
            linearized_dependency_ancestor = other_role_name
    linearized_dependency_descendant = other_role_name if linearized_dependency_ancestor == role_name else role_name
    return linearized_dependency_ancestor, linearized_dependency_descendant


def _reattach_subtree(
    *,
    construct_definition: internal_types.IntermediateConstructDefinition,
    reattachment_target_role_name: str,
    reattachment_source_role_name: str
) -> None:
    """Modify the given construct definition in place to reattach a role-dependency subtree containing
    the given source role, such that the given target role will become one of its ancestors.

    If the attachment target is already an ancestor of the attachment source, no modifications
    are needed. Otherwise, we will climb up from the source to its highest ancestor A that is not
    also an ancestor of the target, and then reattach to the target the subtree rooted in A. We do
    this simply by changing A's parent to the target (and updating children records as needed).

    Naively, we might try to make the source's primogenitor, P, a child of the target, but this will
    fail in the case where the target also descends from P, in particular the case where the target's
    pool is anchored in P. (Since P would then be a child of the target, despite the target requiring
    P to be cast first.) In other words, we need to take special care when the source is a collateral
    relative of the target, hence our procedure here.

    Args:
        construct_definition: An intermediate construct definition for which forest construction is already underway.
        reattachment_target_role_name: The role that will become the parent of the reattached subtree.
        reattachment_source_role_name: The role whose ancestor will serve as the root of the reattached subtree.

    Returns:
        None (modifies the given construct definition in place).
    """
    # Climb up from the source to find to its highest ancestor `A` that is not also an ancestor
    # of the target. `A` will serve as the root of the subtree we reattach under the target.
    head_ancestor_names = _get_ancestors(
        construct_definition=construct_definition,
        role_name=reattachment_target_role_name
    )
    source_ancestor_definition: external_types.RoleDefinition = (
        construct_definition['roles'][reattachment_source_role_name]
    )
    while source_ancestor_definition['parent']:
        if source_ancestor_definition['parent'] == reattachment_target_role_name:
            # No modifications are needed, because the source is already a descendant of the target
            return
        if source_ancestor_definition['parent'] in head_ancestor_names:
            # We found `A`, so we can stop climbing
            break
        source_ancestor_definition = construct_definition['roles'][source_ancestor_definition['parent']]
    # Leaving its descendant structure intact, make `A` a child of the target
    if source_ancestor_definition['parent']:
        original_parent = construct_definition['roles'][source_ancestor_definition['parent']]
        original_parent['children'].remove(source_ancestor_definition['name'])
    source_ancestor_definition['parent'] = reattachment_target_role_name
    reattachment_head_role_definition = construct_definition['roles'][reattachment_target_role_name]
    reattachment_head_role_definition['children'].append(source_ancestor_definition['name'])


def _organize_dependency_forest(
    *,
    construct_definition: internal_types.IntermediateConstructDefinition,
    required_roles: list[external_types.RoleDefinition]
) -> None:
    """Organize the dependency forest for the given construct definition, and attribute its forest roots.

    Args:
        construct_definition: An intermediate construct definition for which forest construction has already occurred.
        required_roles: A list containing definitions for all required roles in the given construct definition.

    Returns:
        None (modifies the construct definition in place).
    """
    # While we've constructed the forest by attributing parents and children to all the required roles,
    # we haven't stored any listing of the trees formed thereby, or specifically their roots. We need
    # such a listing so that we can proceed through the trees one by one during role casting, to cast
    # the roles in a depth-first manner.
    role_forest_tree_roots = [role['name'] for role in required_roles if not role['parent']]
    # Now we'll sort the forest tree roots such that larger trees come first. This heuristic proceeds
    # from an assumption that it's better to reach fail states as soon as possible, and fail states
    # are more likely to occur amid complex dependencies.
    role_forest_tree_roots.sort(
        key=lambda tree_root_name: len(_get_descendants(
            construct_definition=construct_definition,
            role_name=tree_root_name
        )),
        reverse=True
    )
    # Within each tree, let's also sort subtrees using the same heuristic
    for role_definition in construct_definition['roles'].values():
        role_definition['children'].sort(
            key=lambda child_role_name: len(_get_descendants(
                construct_definition=construct_definition,
                role_name=child_role_name
            )),
            reverse=True
        )
    # Finally, attribute the forest roots to the construct definition
    construct_definition['roleForestRoots'] = role_forest_tree_roots


def _get_ancestors(
    *,
    construct_definition: internal_types.IntermediateConstructDefinition,
    role_name: external_types.RoleName
) -> set[external_types.RoleName]:
    """Return the names of all ancestors of the given role in the dependency forest
    for the given construct definition.

    Args:
        construct_definition: An intermediate construct definition for which forest construction is already underway.
        role_name: Name of the role whose dependency ancestors are to be retrieved.

    Returns:
        A set containing the names of all dependency ancestors of the given role.
    """
    role_ancestors: set[external_types.RoleName] = set()
    role_definition: external_types.RoleDefinition = construct_definition['roles'][role_name]
    parent_name: external_types.RoleName | None = role_definition['parent']
    if parent_name is not None:
        role_ancestors.add(parent_name)
        role_ancestors |= _get_ancestors(construct_definition=construct_definition, role_name=parent_name)
    return role_ancestors


def _get_descendants(
    *,
    construct_definition: internal_types.IntermediateConstructDefinition,
    role_name: external_types.RoleName
) -> set[external_types.RoleName]:
    """Return the names of all descendants of the given role in the dependency forest
    for the given construct definition.

    Args:
        construct_definition: An intermediate construct definition for which forest construction is already underway.
        role_name: The role whose dependency descendants are to be retrieved.

    Returns:
        A set containing the names of all dependency descendants of the given role.
    """
    role_descendants: set[external_types.RoleName] = set()
    role_definition: external_types.RoleDefinition = construct_definition['roles'][role_name]
    for child_name in role_definition['children']:
        role_descendants.add(child_name)
        role_descendants |= _get_descendants(construct_definition=construct_definition, role_name=child_name)
    return role_descendants


def build_condition_groups(*, combined_ast: internal_types.CombinedAST) -> None:
    """Modify the given construct definitions in place by attributing a `conditions` field
    that maps role names to (only) the conditions that must be evaluated to cast that role.

    This function also sorts condition references in dependency-stream order.

    Note that by this point, we will have already caught cases of a condition referencing multiple optional roles.

    Args:
        combined_ast: A combined AST following role-forest construction.

    Returns:
        None (modifies the construct definitions in place).
    """
    for construct_definition in utils.get_all_construct_definitions(combined_ast=combined_ast):
        global_conditions = []  # See note just below
        role_name_to_conditions = {role_name: [] for role_name in construct_definition['roles']}
        for condition in construct_definition["_conditions_raw"]:
            # If there are no references, assign it to the global conditions. Such conditions
            # (e.g., a bare chance expression) can be evaluated at the very beginning of targeting,
            # prior to casting any roles.
            if not condition['references']:
                global_conditions.append(condition)
                continue
            # If there's a single reference, assign it to that role
            if len(condition['references']) == 1:
                role_name_to_conditions[condition['references'][0]].append(condition)
                continue
            # If there's an optional role referenced, assign it to the optional role. Note that by
            # now we have already enforced that a condition reference at most one optional role.
            assigned_to_optional = False
            for role_name in condition['references']:
                if construct_definition['roles'][role_name]['min'] == 0:
                    role_name_to_conditions[role_name].append(condition)
                    assigned_to_optional = True
                    break
            if assigned_to_optional:
                continue
            # Otherwise, assign it to the role furthest downstream in the dependency structure. Since all
            # roles sharing a condition will be situated in a direct line in this structure, we can
            # easily identify the most downstream role as the one with the most ancestors. For clarity,
            # we'll sort the actual condition `references` value in upstream-to-downstream order.
            condition['references'].sort(
                key=lambda role_name: len(_get_ancestors(
                    construct_definition=construct_definition,
                    role_name=role_name
                ))
            )
            role_name_to_conditions[condition['references'][-1]].append(condition)
        construct_conditions = external_types.ConstructConditions(
            globalConditions=global_conditions,
            roleConditions=role_name_to_conditions
        )
        construct_definition["conditions"] = construct_conditions
