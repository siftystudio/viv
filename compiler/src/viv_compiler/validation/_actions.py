"""Internal functionality for validating action definitions."""

__all__ = ["validate_action_definitions"]

from viv_compiler import errors, external_types
from ._common import validate_common_concerns
from ._utils import is_non_numeric_expression


def validate_action_definitions(*, content_bundle: external_types.ContentBundle) -> None:
    """Validate the action definitions in the given compiled content bundle.

    Args:
        content_bundle: A compiled content bundle.

    Returns:
        None. Only returns if no issue was detected downstream.
    """
    for action_definition in content_bundle["actions"].values():
        # Validate general issues that pertain to all construct types
        validate_common_concerns(construct_definition=action_definition, content_bundle=content_bundle)
        # Validate saliences
        _validate_action_saliences(action_definition=action_definition)
        # Validate associations
        _validate_action_associations(action_definition=action_definition)


def _validate_action_saliences(*, action_definition: external_types.ActionDefinition) -> None:
    """Validate the given action definition's `saliences` field.

    Args:
        action_definition: An action definition from a compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: Undefined role in saliences.
        VivCompileError: Non-character role in saliences.
        VivCompileError: Saliences variable shadows role name.
        VivCompileError: Non-numeric saliences expression.
    """
    # Detect role entries for undefined roles
    all_role_names = set(action_definition['roles'])
    for role_name in action_definition['saliences']['roles']:
        if role_name not in all_role_names:
            raise errors.VivCompileError(
                f"Action '{action_definition['name']}' has 'saliences' with 'roles' "
                f"entry for undefined role: '{role_name}'"
            )
        role_definition = action_definition['roles'][role_name]
        if role_definition["entityType"] != external_types.RoleEntityType.CHARACTER:
            raise errors.VivCompileError(
                f"Action '{action_definition['name']}' has 'saliences' with 'roles' "
                f"entry for non-character role: '{role_name}'"
            )
    # Detect cases of a saliences variable shadowing the name of a role from the same action
    if action_definition['saliences']['variable']:
        if action_definition['saliences']['variable']['name'] in all_role_names:
            raise errors.VivCompileError(
                f"Action '{action_definition['name']}' has 'saliences' field with custom 'for _' variable name that "
                f"shadows role name '{action_definition['saliences']['variable']['name']}' (this is not allowed)"
            )
    # Detect cases of a custom salience-yielding expression that won't evaluate to a numeric value
    for custom_expression in action_definition['saliences']['custom']:
        if is_non_numeric_expression(expression=custom_expression):
            raise errors.VivCompileError(
                msg=(
                    f"Action '{action_definition['name']}' has 'saliences' field with custom 'for _' expression "
                    f"with invalid expression type (value will be non-numeric): "
                    f"{custom_expression['source']['code']}"
                ),
                source=custom_expression['source'],
            )


def _validate_action_associations(*, action_definition: external_types.ActionDefinition) -> None:
    """Validate the given action definition's `associations` field.

    Args:
        action_definition: An action definition from a compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: Undefined role in associations.
        VivCompileError: Non-character role in associations.
        VivCompileError: Associations variable shadows role name.
    """
    # Detect role entries for undefined roles
    all_role_names = set(action_definition['roles'])
    for role_name in action_definition['associations']['roles']:
        if role_name not in all_role_names:
            raise errors.VivCompileError(
                f"Action '{action_definition['name']}' has 'associations' field with 'roles' "
                f"entry for undefined role: '{role_name}'"
            )
        role_definition = action_definition['roles'][role_name]
        if role_definition["entityType"] != external_types.RoleEntityType.CHARACTER:
            raise errors.VivCompileError(
                f"Action '{action_definition['name']}' has 'associations' with 'roles' "
                f"entry for non-character role: '{role_name}'"
            )
    # Detect cases of an associations variable shadowing the name of a role from the same action
    if action_definition['associations']['variable']:
        if action_definition['associations']['variable']['name'] in all_role_names:
            raise errors.VivCompileError(
                f"Action '{action_definition['name']}' has 'associations' field with 'custom' variable name that "
                f"shadows role name '{action_definition['associations']['variable']['name']}' (this is not allowed)"
            )
