"""Handles postprocessing of compiled ASTs for the Viv DSL."""

__all__ = ["postprocess_combined_ast"]

from viv_compiler import config, errors, external_types, internal_types, utils, validation
from ._inheritance import handle_inheritance
from ._role_dependencies import build_role_dependency_forests, build_condition_groups


def postprocess_combined_ast(*, combined_ast: internal_types.CombinedAST) -> None:
    """Postprocess the given combined AST by inserting higher-order metadata and performing other manipulations.

    Args:
        combined_ast: An abstract syntax tree produced by the Visitor class, integrating the
            respective ASTs of any included files.

    Returns:
        Nothing. Mutates the combined AST in place.
    """
    # Handle inheritance between action definitions
    handle_inheritance(combined_ast=combined_ast)
    # For each action selector that implicitly passes through an initiator role, create a (virtual)
    # initiator role for the selector (if needed) and populate the precast bindings for all
    # associated candidates. This step must precede construction of the role-dependency forests.
    _populate_initiator_pass_through_action_selectors(combined_ast=combined_ast)
    # Resolve any positional bindings in trope fits
    _resolve_positional_bindings(combined_ast=combined_ast)
    # Wrap applicable fields with their associated role references
    _wrap_expressions_with_role_references(combined_ast=combined_ast)
    # Mark initiator roles as `precast`
    _mark_initiator_roles_as_precast(combined_ast=combined_ast)
    # Set the `initiator` field in the action definitions
    _attribute_initiator_role(combined_ast=combined_ast)
    # Attribute to casting-pool directives whether they are cachable. This must come
    # after `_attribute_initiator_role()` has been called.
    _attribute_casting_pool_cachability_values(combined_ast=combined_ast)
    # For each construct definition, construct a dependency forest that will structure
    # role casting during targeting of that construct.
    build_role_dependency_forests(combined_ast=combined_ast)
    # Finally, convert the `conditions` field into a mapping from role name to (only)
    # the conditions that must be evaluated to cast that role.
    build_condition_groups(combined_ast=combined_ast)


def _populate_initiator_pass_through_action_selectors(*, combined_ast: internal_types.CombinedAST) -> None:
    """For each selector that implicitly passes through an initiator role, create a (virtual) initiator
    role for the selector (if needed) and populate the precast bindings for all associated candidates.

    If an author elides the bindings on a selector candidate, the initiator at hand (for targeting of
    the selector itself) will be passed on as the prospective initiator of the candidate. If an author
    also elides the `roles` field in the selector, we will create a virtual initiator role that the
    selector can pass through to its candidates as it targets them in turn.

    Args:
        combined_ast: A combined AST as produced by inheritance processing.

    Returns:
        None. Mutates the construct definitions in place.
    """
    # Before we start, prevalidate all selectors
    validation.prevalidate_action_selectors(combined_ast=combined_ast)
    # Create virtual initiator roles, as needed
    for selector_definition in combined_ast["actionSelectors"]:
        if not any(utils.is_initiator_role(role_definition=role) for role in selector_definition['roles'].values()):
            virtual_initiator_role = external_types.RoleDefinition(
                name=config.SELECTOR_VIRTUAL_INITIATOR_ROLE_NAME,
                entityType=external_types.RoleEntityType.CHARACTER,
                min=1,
                max=1,
                parent=None,
                children=[],
                pool=None,
                chance=None,
                mean=None,
                sd=None,
                participationMode=external_types.RoleParticipationMode.INITIATOR,
                anywhere=False,
                precast=False,
                spawn=False,
                spawnFunction=None,
                renames=None
            )
            selector_definition["roles"][virtual_initiator_role['name']] = virtual_initiator_role
    # Populate precast bindings for all candidates that were specified using the initiator pass-through pattern
    for selector_definition in combined_ast["actionSelectors"]:
        selector_initiator_role = next(
            role for role in selector_definition['roles'].values() if utils.is_initiator_role(role_definition=role)
        )
        selector_initiator_role_name = selector_initiator_role['name']
        for candidate in selector_definition["candidates"]:
            if candidate["bindings"]["roles"]:
                continue
            if candidate["isSelector"]:
                candidate_definition = next(
                    selector for selector in combined_ast['actionSelectors'] if selector['name'] == candidate['name']
                )
            else:
                candidate_definition = next(
                    action for action in combined_ast['actions'] if action['name'] == candidate['name']
                )
            candidate_initiator_role = next(
                (role for role in candidate_definition['roles'].values()
                 if utils.is_initiator_role(role_definition=role)),
                None
            )
            if candidate_initiator_role is None:
                raise errors.VivCompileError(
                    f"Action-selector '{selector_definition['name']}' has candidate "
                    f"'{candidate['name']}' that does not define an initiator role"
                )
            candidate_initiator_role_name = candidate_initiator_role["name"]
            candidate["bindings"]["roles"][candidate_initiator_role_name] = external_types.EntityReference(
                type=external_types.ExpressionDiscriminator.ENTITY_REFERENCE,
                value=external_types.ReferenceValue(
                    anchor=selector_initiator_role_name,
                    path=[],
                    local=False,
                    group=False,
                    failSafe=False
                ),
                source=None,
                negated=False
            )


def _resolve_positional_bindings(*, combined_ast: internal_types.CombinedAST) -> None:
    """Resolve any positional bindings in trope fits.

    This function only errors when it can't do its work of resolving positional bindings, which occurs
    with the given issues stated below. During the actual validation phase, we will work more thoroughly
    to catch things like missing bindings.

    Args:
        combined_ast: A combined AST as produced by inheritance processing.

    Returns:
        None. Mutates the construct definitions in place.

    Raises:
        VivCompileError: A trope fit targets an undefined trope.
        VivCompileError: A trope fit has too many positional bindings.
    """
    for construct_definition in utils.get_all_construct_definitions(combined_ast=combined_ast):
        all_trope_fits: list[external_types.TropeFit] = utils.get_all_expressions_of_type(
            expression_type=external_types.ExpressionDiscriminator.TROPE_FIT,
            ast_chunk=construct_definition
        )
        for trope_fit in all_trope_fits:
            trope_fit_expression: external_types.TropeFitValue = trope_fit['value']
            trope_fit_source = trope_fit['source']
            # Retrieve the trope definition. If it targets an undefined trope, throw an error.
            try:
                trope_definition = next(
                    trope for trope in combined_ast['tropes'] if trope['name'] == trope_fit_expression['tropeName']
                )
            except StopIteration:
                raise errors.VivCompileError(
                    msg=(
                        f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
                        f"references undefined trope: '{trope_fit_expression['tropeName']}'"
                    ),
                    source=trope_fit_source
                )
            # Resolve any positional bindings
            trope_fit_binding_role_names = list(trope_fit_expression['bindings']['roles'])
            for bound_role_name in trope_fit_binding_role_names:
                # The Viv grammar does not allow mixing of positional and named bindings, so we can
                # immediately move on from any trope fit with a named binding.
                if not bound_role_name.startswith(config.POSITIONAL_BINDING_TRANSIENT_PREFIX):
                    break
                # If we have an extra binding, throw an error now
                role_position = int(bound_role_name[len(config.POSITIONAL_BINDING_TRANSIENT_PREFIX):])
                if role_position >= len(trope_definition['roles']):  # Positional bindings are 0-indexed
                    n_roles = len(trope_definition['roles'])
                    n_roles_precast = len(trope_fit_binding_role_names)
                    raise errors.VivCompileError(
                        msg=(
                            f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                            f"'{construct_definition['name']}' invokes trope "
                            f"'{trope_fit_expression['tropeName']}' with too many positional "
                            f"bindings (expected at most {n_roles}, got {n_roles_precast})"
                        ),
                        source=trope_fit_source
                    )
                # Otherwise, resolve the positional binding by attributing the role name associated
                # with that slot. Note that dictionary keys have been ordered since Python 3.7.
                resolved_role_name = list(trope_definition['roles'].keys())[role_position]
                trope_fit_expression['bindings']['roles'][resolved_role_name] = (
                    trope_fit_expression['bindings']['roles'][bound_role_name]
                )
                del trope_fit_expression['bindings']['roles'][bound_role_name]


def _wrap_expressions_with_role_references(*, combined_ast: internal_types.CombinedAST) -> None:
    """Wrap applicable fields with their role references.

    Args:
        combined_ast: A combined AST as produced by inheritance processing.

    Returns:
        None. Mutates the construct definitions in place.
    """
    # For all constructs, we'll wrap conditions
    for construct_definition in utils.get_all_construct_definitions(combined_ast=combined_ast):
        condition_wrappers = []
        for condition in construct_definition["_conditions_raw"]:
            wrapper = external_types.WrappedExpression(
                body=condition,
                references=utils.get_all_referenced_roles(ast_chunk=condition)
            )
            condition_wrappers.append(wrapper)
        construct_definition["_conditions_raw"] = condition_wrappers
    # For actions, we'll also wrap effects and reactions, producing the final schema-compliant field values
    for action_definition in combined_ast["actions"]:
        effect_wrappers = []
        for effect in action_definition["_effects_raw"]:
            wrapper = external_types.WrappedExpression(
                body=effect,
                references=utils.get_all_referenced_roles(ast_chunk=effect)
            )
            effect_wrappers.append(wrapper)
        action_definition["effects"] = effect_wrappers
        reaction_wrappers = []
        for reaction in action_definition["_reactions_raw"]:
            wrapper = external_types.WrappedExpression(
                body=reaction,
                references=utils.get_all_referenced_roles(ast_chunk=reaction)
            )
            reaction_wrappers.append(wrapper)
        action_definition["reactions"] = reaction_wrappers


def _attribute_initiator_role(*, combined_ast: internal_types.CombinedAST) -> None:
    """Modify the given action and selector definitions in place, to attribute to each an initiator role.

    Args:
        combined_ast: A combined AST as produced by inheritance processing.

    Returns:
        None (modifies the action and selector definitions in place).

    Raises:
        VivCompileError: If an action definition or selector definition does not define an initiator role.
    """
    validation.prevalidate_initiator_roles(combined_ast=combined_ast)  # Ensures there's always exactly one initiator
    for construct_definition in utils.get_all_construct_definitions(combined_ast=combined_ast):
        if construct_definition['type'] in config.CONSTRUCT_TYPES_USING_INITIATOR_ROLES:
            initiator_role: external_types.RoleDefinition = next(
                role for role in construct_definition['roles'].values()
                if utils.is_initiator_role(role_definition=role)
            )
            construct_definition['initiator'] = initiator_role['name']


def _mark_initiator_roles_as_precast(*, combined_ast: internal_types.CombinedAST) -> None:
    """Modify the given construct definitions in place to mark initiator roles as `precast`.

    Args:
        combined_ast: A combined AST as produced by inheritance processing.

    Returns:
        None. Mutates the construct definitions in place.
    """
    for construct_definition in utils.get_all_construct_definitions(combined_ast=combined_ast):
        for role_definition in construct_definition['roles'].values():
            role_definition: external_types.RoleDefinition
            # If this is an initiator role, explicitly attribute the 'precast' label
            if utils.is_initiator_role(role_definition=role_definition):
                role_definition["precast"] = True


def _attribute_casting_pool_cachability_values(*, combined_ast: internal_types.CombinedAST) -> None:
    """Modify the given action definitions in place to mark casting-pool declarations as cachable/uncachable.

    Currently only action roles can have cachable casting-pool declarations. These are attributed
    when a pool declaration does not reference a non-initiator role.

    Args:
        combined_ast: A combined AST as produced by inheritance processing.

    Returns:
        None. Mutates the construct definitions in place.
    """
    for action_definition in combined_ast["actions"]:
        for role_definition in action_definition['roles'].values():
            if not role_definition['pool']:
                continue
            role_definition['pool']['uncachable'] = False
            all_pool_references = utils.get_all_referenced_roles(ast_chunk=role_definition['pool'])
            if any(role for role in all_pool_references if role != action_definition['initiator']):
                role_definition['pool']['uncachable'] = True
