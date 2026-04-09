"""Internal functionality for validating role definitions."""

__all__ = ["validate_roles"]

from viv_compiler import config, errors, external_types, utils


def validate_roles(*, construct_definition: external_types.ConstructDefinition) -> None:
    """Validate the role definitions in the given construct definition.

    Args:
        construct_definition: A construct definition in a compiled content bundle.

    Returns:
        None. Only returns if no issue was detected downstream.
    """
    # Validate the role labels
    _validate_role_labels(construct_definition=construct_definition)
    # Make sure all roles have proper 'min' and 'max' values
    _validate_role_min_and_max_values(construct_definition=construct_definition)
    # Make sure all roles have proper 'chance' and 'mean' values
    _validate_role_chance_and_mean_values(construct_definition=construct_definition)
    # Make sure all roles with casting pools have proper ones
    _validate_casting_pool_directives(construct_definition=construct_definition)
    # If this is a construct of a type using an initiator role, validate its initiator role
    if construct_definition['type'] in config.CONSTRUCT_TYPES_USING_INITIATOR_ROLES:
        _validate_initiator_role(construct_definition=construct_definition)


def _validate_role_labels(*, construct_definition: external_types.ConstructDefinition) -> None:
    """Ensure that the given construct definition has valid role labels.

    Args:
        construct_definition: A construct definition in a compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: A role has a label not permitted for this construct type.
        VivCompileError: A non-character role has a participation mode label.
        VivCompileError: A character role in an action/selector has no participation mode or modifier.
        VivCompileError: A non-reserved action/selector has a precast role.
        VivCompileError: A role has mutually incompatible labels.
    """
    for role_definition in construct_definition['roles'].values():
        # Ensure that the labels are permitted given the construct type
        reconstructed_role_labels = _reconstruct_role_labels(role_definition=role_definition)
        valid_role_labels = config.ROLE_LABELS_PERMITTED_IN_CONSTRUCT_OF_TYPE[construct_definition["type"]]
        for role_label in reconstructed_role_labels:
            if role_label not in valid_role_labels:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
                    f"has role '{role_definition['name']}' with invalid role label '{role_label}' (only these labels "
                    f"are allowed in a {utils.CONSTRUCT_LABEL[construct_definition['type']].lower()}: "
                    f"{', '.join(valid_role_labels)})"
                )
        # Ensure that only character roles have a role-participation mode attributed
        if role_definition['participationMode']:
            if role_definition['entityType'] != external_types.RoleEntityType.CHARACTER:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
                    f" has role '{role_definition['name']}' with '{role_definition['participationMode']}' "
                    f"label but no 'character' label ('{role_definition['participationMode']}' may only be "
                    f"used for character roles)"
                )
        # Ensure that character roles in actions (and action selectors) have a role-participation
        # mode or else a modifier that obviates the need for one. In other words, flag cases of
        # a bare `as: character` in an action or action selector.
        if construct_definition['type'] in config.CONSTRUCT_TYPES_USING_INITIATOR_ROLES:
            if role_definition['entityType'] == external_types.RoleEntityType.CHARACTER:
                if (
                    not role_definition['participationMode']
                    and not role_definition['anywhere']
                    and not role_definition['precast']
                    and not role_definition['spawn']
                ):
                    raise errors.VivCompileError(
                        f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
                        f"has role '{role_definition['name']}' with 'character' label but no participation mode "
                        f"('initiator', 'partner', 'recipient', 'bystander') or modifier label "
                        f"('anywhere', 'precast', 'spawn') -- necessary for actions and action selectors"
                    )
        # Ensure that the `precast` label is used properly
        if role_definition['precast'] and not utils.is_initiator_role(role_definition=role_definition):
            if (
                construct_definition['type'] == external_types.ConstructDiscriminator.ACTION or
                construct_definition['type'] == external_types.ConstructDiscriminator.ACTION_SELECTOR
            ):
                if not construct_definition['reserved']:
                    raise errors.VivCompileError(
                        f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
                        f" is not marked 'reserved' and has role {role_definition['name']}' with 'precast' label "
                        f"(only allowed in reserved actions/selectors)"
                    )
        # Ensure that no incompatible labels appear
        for pool in config.MUTUALLY_INCOMPATIBLE_ROLE_LABELS:
            for field in pool:
                if field not in reconstructed_role_labels:
                    continue
                for other_field in pool:
                    if field == other_field:
                        continue
                    if other_field not in reconstructed_role_labels:
                        continue
                    raise errors.VivCompileError(
                        f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                        f"'{construct_definition['name']}' has role '{role_definition['name']}' with incompatible "
                        f"(implied) role labels: '{field}' and '{other_field}'"
                    )


def _reconstruct_role_labels(*, role_definition: external_types.RoleDefinition) -> list[str]:
    """Return a list containing role labels reconstructed for the given role.

    Args:
        role_definition: Definition for the role whose labels will be reconstructed.

    Returns:
        A list containing role labels reconstructed for the given role.

    Raises:
        VivCompileError: The role has an unexpected entity type.
    """
    reconstructed_role_labels: list[str] = []
    match role_definition['entityType']:
        case external_types.RoleEntityType.CHARACTER:
            reconstructed_role_labels.append("character")
        case external_types.RoleEntityType.ITEM:
            reconstructed_role_labels.append("item")
        case external_types.RoleEntityType.LOCATION:
            reconstructed_role_labels.append("location")
        case external_types.RoleEntityType.ACTION:
            reconstructed_role_labels.append("action")
        case external_types.RoleEntityType.SYMBOL:
            reconstructed_role_labels.append("symbol")
        case _:
            raise errors.VivCompileError(
                f"Unexpected entity type for role '{role_definition['name']}': '{role_definition['entityType']}'"
            )
    match role_definition['participationMode']:
        case None:
            pass
        case external_types.RoleParticipationMode.INITIATOR:
            reconstructed_role_labels.append("initiator")
        case external_types.RoleParticipationMode.PARTNER:
            reconstructed_role_labels.append("partner")
        case external_types.RoleParticipationMode.RECIPIENT:
            reconstructed_role_labels.append("recipient")
        case external_types.RoleParticipationMode.BYSTANDER:
            reconstructed_role_labels.append("bystander")
    if role_definition["anywhere"]:
        reconstructed_role_labels.append("anywhere")
    if role_definition["precast"]:
        reconstructed_role_labels.append("precast")
    if role_definition["spawn"]:
        reconstructed_role_labels.append("spawn")
    return reconstructed_role_labels


def _validate_role_min_and_max_values(*, construct_definition: external_types.ConstructDefinition) -> None:
    """Ensure that the given construct definition has no role definition with invalid `min` or `max` value.

    Args:
        construct_definition: A construct definition in a compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: A role has a negative min value.
        VivCompileError: A role has a max value less than 1.
        VivCompileError: A role has a min value greater than its max value.
    """
    for role_definition in construct_definition["roles"].values():
        # Detect minimums less than 0
        if role_definition['min'] < 0:
            raise errors.VivCompileError(
                f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
                f"has role '{role_definition['name']}' with negative min (must be 0 or greater)"
            )
        # Detect maximums of 0 or less
        if role_definition['max'] < 1:
            raise errors.VivCompileError(
                f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
                f"has role '{role_definition['name']}' with max less than 1 (to turn off role, "
                f"comment it out or use chance of [0%])"
            )
        # Detect role-count minimums that are greater than role-count maximums
        if role_definition['min'] > role_definition['max']:
            raise errors.VivCompileError(
                f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
                f"has role '{role_definition['name']}' with min > max"
            )


def _validate_role_chance_and_mean_values(*, construct_definition: external_types.ConstructDefinition) -> None:
    """Ensure that the given construct definition has no role definition with invalid `chance` or `mean` value.

    Args:
        construct_definition: A construct definition in a compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: A role has a chance value but no optional slots (min equals max).
        VivCompileError: A role has a chance value outside the 0-100% range.
        VivCompileError: A role has a mean value outside its min-max range.
    """
    for role_definition in construct_definition["roles"].values():
        if role_definition['chance']:
            # Confirm that 'chance' is only present if there are optional slots for this role
            if role_definition['min'] == role_definition['max']:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
                    f"has role '{role_definition['name']}' with optional-slot casting probability, but this is "
                    f"only allowed for roles with optional slots (max > min)"
                )
            # Confirm that 'chance', if present, is between 0.0 and 1.0
            if role_definition['chance'] < 0.0 or role_definition['chance'] > 1.0:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
                    f"has role '{role_definition['name']}' with invalid optional-slot casting probability "
                    f" (must be between 0-100%)"
                )
        # Confirm that 'mean', if present, is between min and max
        if role_definition['mean']:
            role_min, role_max = role_definition['min'], role_definition['max']
            if role_definition['mean'] < role_min or role_definition['mean'] > role_max:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
                    f"has role '{role_definition['name']}' with invalid slots mean (must be between min and max)"
                )


def _validate_casting_pool_directives(*, construct_definition: external_types.ConstructDefinition) -> None:
    """Ensure that the given construct definition does not have an invalid casting-pool directive.

    Note: During preliminary validation we would have already flagged the following issues:
        - A casting-pool directive that references an undefined role or an optional role.
        - An initiator role with a casting-pool directive.

    Args:
        construct_definition: A construct definition in a compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: An action or symbol role has no casting-pool directive.
        VivCompileError: A role uses 'is' or a singleton pool but has max other than 1.
        VivCompileError: A precast role has a casting-pool directive.
        VivCompileError: A spawn role has a casting-pool directive.
        VivCompileError: A casting-pool directive references a spawn role.
    """
    for role_definition in construct_definition["roles"].values():
        requires_pool_directive = False
        if role_definition['precast'] or role_definition['spawn']:
            pass
        elif role_definition['entityType'] == external_types.RoleEntityType.ACTION:
            requires_pool_directive = True
        elif role_definition['entityType'] == external_types.RoleEntityType.SYMBOL:
            requires_pool_directive = True
        if requires_pool_directive and not role_definition["pool"]:
            raise errors.VivCompileError(
                f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
                f"has role '{role_definition['name']}' that requires a pool declaration but does not have one"
            )
        # Force "is" casting-pool directives to correspond to a max of exactly 1, since this is the "is"
        # semantics. Note that we don't actually retain any data marking that the 'is' operator was used, but
        # rather we create a casting-pool expression that is a list containing a single element, that being the
        # reference for the entity associated with the 'is' usage. We could end up with this same shape if the
        # author uses 'from' with a literal singleton array -- e.g. "hat from ["hat"]: symbol" -- so the error
        # message will refer to both potential causes.
        if role_definition['pool']:
            if role_definition["pool"]["body"]["type"] == external_types.ExpressionDiscriminator.LIST:
                if len(role_definition["pool"]["body"]["value"]) == 1:
                    # If we're in here, this is either an 'is' usage or a case of 'from' with a literal singleton array
                    if role_definition['max'] != 1:
                        raise errors.VivCompileError(
                            f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                            f"'{construct_definition['name']}' has role '{role_definition['name']}' that uses 'is' "
                            f"casting-pool directive (or 'from' with a singleton array) with a max other than 1"
                        )
            # Prohibit casting-pool directives for roles carrying the 'precast' label
            if role_definition['precast']:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
                    f" has role '{role_definition['name']}' that carries the 'precast' label but has a casting-pool "
                    f"directive (these are incompatible, because the directive would always be ignored)"
                )
            # Prohibit casting-pool directives for roles carrying the `spawn` label
            if role_definition['spawn']:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
                    f" has role '{role_definition['name']}' that carries the 'spawn' label but has a casting-pool "
                    f"directive (these are incompatible)"
                )
            # Prohibit casting-pool directives anchored in roles carrying the `spawn` label
            if role_definition['pool']:
                for anchor_role_name in utils.get_all_referenced_roles(ast_chunk=role_definition["pool"]):
                    anchor_role_definition = construct_definition['roles'][anchor_role_name]
                    if anchor_role_definition['spawn']:
                        raise errors.VivCompileError(
                            f"Casting-pool directive for role '{role_definition['name']}' in "
                            f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} "
                            f"'{construct_definition['name']}' references a role carrying the 'spawn' label"
                        )


def _validate_initiator_role(*, construct_definition: external_types.ActionDefinition) -> None:
    """Ensure that the given construct definition has a valid initiator role definition.

    A few notes:
        - We already prevalidated that the construct definition has exactly one initiator role.
        - We do not check for chance on the initiator role here, because an initiator
          must have `min==max==1`, and chance on a fixed-count role is already caught by
          `_validate_role_chance_and_mean_values`.

    Args:
        construct_definition: A construct definition from a compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: The initiator role has min other than 1.
        VivCompileError: The initiator role has max other than 1.
        VivCompileError: The initiator role has a declared casting mean.
    """
    # Retrieve the definition for the initiator role
    initiator_role_definition = construct_definition['roles'][construct_definition['initiator']]
    # Make sure that the initiator role casts exactly one entity
    if initiator_role_definition['min'] != 1:
        raise errors.VivCompileError(
            f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
            f"has initiator role '{initiator_role_definition['name']}' with min other than 1 "
            f" (there must be a single initiator)"
        )
    if initiator_role_definition['max'] != 1:
        raise errors.VivCompileError(
            f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
            f"has initiator role '{initiator_role_definition['name']}' with max other than 1 "
            f"(there must be a single initiator)"
        )
    # Make sure that the initiator role has no specified casting mean
    if initiator_role_definition['mean']:
        raise errors.VivCompileError(
            f"{utils.CONSTRUCT_LABEL[construct_definition['type']]} '{construct_definition['name']}' "
            f"has initiator role '{initiator_role_definition['name']}' with declared casting mean "
            f"(there must be a single initiator)"
        )
