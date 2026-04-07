"""Handles inheritance between action definitions."""

__all__ = ["handle_inheritance"]

import copy
from typing import Any, Final

from viv_compiler import errors, external_types, internal_types, sentinels, validation


def handle_inheritance(*, combined_ast: internal_types.CombinedAST) -> None:
    """Modify the given combined AST in place to honor all inheritance declarations.

    Any template actions (definitions prepended with the `template` marker) will be deleted
    as a final step in this procedure.

    Note: Currently only action definitions support inheritance.

    Args:
        combined_ast: An abstract syntax tree produced by the Visitor class, integrating the
            respective ASTs of any included files.

    Returns:
        None (construct definitions are modified in place).
    """
    validation.prevalidate_action_inheritance(combined_ast=combined_ast)
    intermediate_action_definitions = combined_ast["actions"]
    outstanding_child_action_names = [action['name'] for action in combined_ast["actions"] if action['parent']]
    while outstanding_child_action_names:
        made_progress = False
        for i, child_action_definition in enumerate(intermediate_action_definitions):
            child_action_definition: internal_types.IntermediateChildActionDefinition
            if child_action_definition['name'] not in outstanding_child_action_names:
                continue
            if child_action_definition['parent'] in outstanding_child_action_names:
                # This action's parent itself has a parent, and so we need to wait for the parent
                # to inherit its material first (and so on if there's further dependencies).
                continue
            try:
                parent_action_definition = next(
                    action for action in intermediate_action_definitions
                    if action['name'] == child_action_definition['parent']
                )
            except StopIteration:
                raise errors.VivCompileError(
                    f"Action '{child_action_definition['name']}' declares undefined parent action "
                    f"'{child_action_definition['parent']}'"
                )
            # Handle any join directives
            merged_action_definition = _merge_action_definitions(
                child_action_definition=child_action_definition,
                parent_action_definition=parent_action_definition
            )
            # Handle any role-renaming declarations
            _handle_role_renaming_declarations(
                merged_action_definition=merged_action_definition,
                parent_action_name=parent_action_definition['name'],
                parent_role_names=set(parent_action_definition['roles'].keys())
            )
            # Save the finalized child action
            intermediate_action_definitions[i] = merged_action_definition
            outstanding_child_action_names.remove(child_action_definition['name'])
            made_progress = True
        # If we made no progress this pass, the remaining names participate in a cycle.
        if not made_progress:
            cycle_actions = "'" + ", ".join(outstanding_child_action_names) + "'"
            raise errors.VivCompileError(f"Inheritance cycle detected among actions: {cycle_actions}")
    # Finally, delete any template actions
    combined_ast["actions"] = [action for action in combined_ast["actions"] if not action['_template']]


def _merge_action_definitions(
    *,
    child_action_definition: internal_types.IntermediateChildActionDefinition,
    parent_action_definition: internal_types.IntermediateActionDefinition
) -> internal_types.IntermediateActionDefinition:
    """Clone the given action definitions and return a merged one that honors the author's inheritance declarations.

    Args:
        child_action_definition: The child action definition that will inherit from the given parent definition.
        parent_action_definition: The parent action definition from which the given child definition will inherit.

    Returns:
        A merged action definition that honors the author's inheritance declarations.
    """
    field_name_to_join_directive_sentinel: Final = {
        "tags": sentinels.CHILD_JOIN_DIRECTIVE_TAGS,
        "roles": sentinels.CHILD_JOIN_DIRECTIVE_ROLES,
        "_conditions_raw": sentinels.CHILD_JOIN_DIRECTIVE_CONDITIONS,
        "scratch": sentinels.CHILD_JOIN_DIRECTIVE_SCRATCH,
        "_effects_raw": sentinels.CHILD_JOIN_DIRECTIVE_EFFECTS,
        "_reactions_raw": sentinels.CHILD_JOIN_DIRECTIVE_REACTIONS,
        "embargoes": sentinels.CHILD_JOIN_DIRECTIVE_EMBARGOES,
    }
    merged_fields = copy.deepcopy(parent_action_definition)
    for field_name, child_field_value in child_action_definition.items():
        merge_needed = (
            field_name in field_name_to_join_directive_sentinel
            and field_name_to_join_directive_sentinel[field_name] in child_action_definition["_join_directives"]
        )
        if merge_needed:
            _merge_action_field(
                merged_fields=merged_fields,
                child_fields=child_action_definition,
                parent_fields=parent_action_definition,
                field_name=field_name
            )
        else:
            merged_fields[field_name] = child_field_value
    merged_action_definition = internal_types.IntermediateActionDefinition(
        type=external_types.ConstructDiscriminator.ACTION,
        name=child_action_definition["name"],
        _template=child_action_definition["_template"],
        reserved=child_action_definition["reserved"],
        parent=None,  # Always `None` for an `IntermediateActionDefinition`, and eventually removed altogether
        roles=merged_fields["roles"],
        importance=merged_fields["importance"],
        tags=merged_fields["tags"],
        gloss=merged_fields["gloss"],
        report=merged_fields["report"],
        _conditions_raw=merged_fields["_conditions_raw"],
        scratch=merged_fields["scratch"],
        _effects_raw=merged_fields["_effects_raw"],
        _reactions_raw=merged_fields["_reactions_raw"],
        saliences=merged_fields["saliences"],
        associations=merged_fields["associations"],
        embargoes=merged_fields["embargoes"],
    )
    return merged_action_definition


def _merge_action_field(
    *,
    merged_fields: dict[str, Any],
    child_fields: dict[str, Any],
    parent_fields: dict[str, Any],
    field_name: str
) -> None:
    """Merges the given field using material from the respective parent and child actions.

    Args:
        merged_fields: The dictionary of merged fields that is being constructed.
        child_fields: The intermediate definition for the action that is inheriting material,
            treated as a dictionary of fields to simplify typing concerns.
        parent_fields: Intermediate definition for the action from which material is being inherited,
            treated as a dictionary of fields to simplify typing concerns.
        field_name: The name of the field to merge.

    Returns:
        Nothing. Mutates `merged_fields` in place.

    Raises:
        VivCompileError: Incompatible field values in the respective definitions.
    """
    both_dicts = isinstance(child_fields.get(field_name), dict) and isinstance(parent_fields.get(field_name), dict)
    both_lists = isinstance(child_fields.get(field_name), list) and isinstance(parent_fields.get(field_name), list)
    if field_name == "tags":  # Special case, since it's technically a dict (list expression)
        merged_fields[field_name]["value"] += child_fields[field_name]["value"]
    elif both_dicts:
        merged_fields[field_name].update(child_fields[field_name])
    elif both_lists:
        merged_fields[field_name] += child_fields[field_name]
    else:
        # Shouldn't be possible, but we'll keep it here as belt and suspenders
        raise errors.VivCompileError(
            f"Cannot join field '{field_name}' in action '{child_fields['name']}': "
            f"expected dict or list for both, got {type(child_fields[field_name]).__name__} "
            f"and {type(parent_fields[field_name]).__name__}"
        )


def _handle_role_renaming_declarations(
    *,
    merged_action_definition: internal_types.IntermediateActionDefinition,
    parent_action_name: external_types.ActionName,
    parent_role_names: set[external_types.RoleName]
) -> None:
    """Modify the given action definition in place to honor all role-renaming declarations.

    A role-renaming declaration (e.g. `new_name<<old_name`) allows an author to rename a role that
    is inherited from a parent action. This entails not just updating the role's name in the child
    action, but also updating any references to the role in material inherited from the parent.

    Args:
        merged_action_definition: A merged action definition, meaning one that was produced by merging
            parent content into the definition of a child that inherits from the parent.
        parent_action_name: The name of the parent action.
        parent_role_names: A set containing all the role names in the parent role.

    Returns:
        None (the input definitions are modified in place).
    """
    # Build a mapping from old names to new names
    old_name_to_new_name: dict[external_types.RoleName, external_types.RoleName] = {}
    for role_definition in merged_action_definition["roles"].values():
        if role_definition["renames"]:
            new_role_name = role_definition['name']
            old_role_name = role_definition["renames"]
            if old_role_name not in parent_role_names:
                raise errors.VivCompileError(
                    f"Action '{merged_action_definition['name']}' attempts to rename role '{old_role_name}', but "
                    f"no such role is defined in the parent action '{parent_action_name}'"
                )
            old_name_to_new_name[old_role_name] = new_role_name
    # Delete the definitions that only specify renamings
    for new_role_name in old_name_to_new_name.values():
        del merged_action_definition['roles'][new_role_name]
    # If the dictionary is empty, there's no role-renaming declarations to handle and we can return now
    if not old_name_to_new_name:
        return
    # Otherwise, let's proceed. First, update the corresponding role definitions
    for role_definition in merged_action_definition["roles"].values():
        if role_definition["name"] in old_name_to_new_name:
            role_definition["name"] = old_name_to_new_name[role_definition["name"]]
    merged_action_definition["roles"] = {role['name']: role for role in merged_action_definition['roles'].values()}
    # Update any embargo `roles` fields, which contain bare role names (not references)
    for embargo in merged_action_definition["embargoes"]:
        if not embargo["roles"]:
            continue
        updated_roles_field = []
        for role_name in embargo["roles"]:
            updated_role_name = old_name_to_new_name.get(role_name, role_name)
            updated_roles_field.append(updated_role_name)
        embargo["roles"] = updated_roles_field
    # Recursively walk the action definition to update all applicable references
    _rewrite_role_references(ast_chunk=merged_action_definition, old_name_to_new_name=old_name_to_new_name)


def _rewrite_role_references(
    *,
    ast_chunk: Any,
    old_name_to_new_name: dict[external_types.RoleName, external_types.RoleName]
) -> Any:
    """Recurse over the given AST chunk to honor any role-renaming declarations captured in the given mapping.

    This function only updates reference AST nodes, for both entity references and symbol references,
    which it reaches by recursively visiting all dictionary values and list elements.

    Args:
        ast_chunk: The AST chunk to search.
        old_name_to_new_name: A mapping from old role names to new role names, as specified in all the
            role-renaming declarations contained in a given action definition that uses inheritance.

    Returns:
        The updated AST chunk, which will also be mutated in place. (Note: its shape will never change.)
    """
    # Recurse over a list value
    if isinstance(ast_chunk, list):
        for i, element in enumerate(ast_chunk):
            ast_chunk[i] = _rewrite_role_references(ast_chunk=element, old_name_to_new_name=old_name_to_new_name)
        return ast_chunk
    # If it's a dictionary, we may just have a reference...
    if isinstance(ast_chunk, dict):
        node_type = ast_chunk.get("type")
        # Rename an entity-reference anchor, if applicable, and recurse over its value
        is_reference = (
                node_type == external_types.ExpressionDiscriminator.ENTITY_REFERENCE or
                node_type == external_types.ExpressionDiscriminator.SYMBOL_REFERENCE
        )
        if is_reference:
            value = ast_chunk.get("value")
            name_of_reference_anchor_role = value["anchor"]
            if name_of_reference_anchor_role in old_name_to_new_name:
                value["anchor"] = old_name_to_new_name[name_of_reference_anchor_role]
            for i, path_component in enumerate(value["path"]):
                value["path"][i] = _rewrite_role_references(
                    ast_chunk=path_component,
                    old_name_to_new_name=old_name_to_new_name
                )
            return ast_chunk
        # Recurse over any other dictionary value
        for key, value in ast_chunk.items():
            ast_chunk[key] = _rewrite_role_references(ast_chunk=value, old_name_to_new_name=old_name_to_new_name)
        return ast_chunk
    # For any other kind of value, there's no need to recurse
    return ast_chunk
