"""Internal functionality for validating selector definitions."""

__all__ = ["validate_action_selector_definitions", "validate_plan_selector_definitions"]

from viv_compiler import errors, external_types, utils
from ._common import validate_common_concerns
from ._utils import detect_cycle_in_graph, is_non_numeric_expression


def validate_action_selector_definitions(*, content_bundle: external_types.ContentBundle) -> None:
    """Validate the action-selector definitions in the given compiled content bundle.

    Args:
        content_bundle: A compiled content bundle.

    Returns:
        None. Only returns if no issue is encountered.
    """
    for action_selector_definition in content_bundle["actionSelectors"].values():
        # Validate general issues that pertain to all construct types
        validate_common_concerns(construct_definition=action_selector_definition, content_bundle=content_bundle)
        # Validate the initiator bindings for all selector candidate
        _validate_action_selector_candidate_initiator_bindings(
            action_selector_definition=action_selector_definition,
            content_bundle=content_bundle
        )
        # Validate issues that pertain to both selector types
        _validate_selector_common_concerns(
            selector_definition=action_selector_definition,
            selector_type=action_selector_definition['type'],
            content_bundle=content_bundle
        )


def _validate_action_selector_candidate_initiator_bindings(
    *,
    action_selector_definition: external_types.ActionSelectorDefinition,
    content_bundle: external_types.ContentBundle
) -> None:
    """Ensure that the given selector action-selector definition precasts its initiator
    in the respective initiator roles of its candidates.

    Args:
        action_selector_definition: The action-selector definition to validate.
        content_bundle: The compiled content bundle containing the selector definition.

    Returns:
        None. Only returns if no issue was detected downstream.

    Raises:
        VivCompileError: Candidate fails to precast initiator role.
        VivCompileError: Candidate's initiator binding is not a direct reference to
            the selector's initiator.
    """
    for candidate in action_selector_definition['candidates']:
        # Retrieve candidate definition
        if candidate['isSelector']:
            candidate_definition = content_bundle['actionSelectors'][candidate['name']]
        else:
            candidate_definition = content_bundle['actions'][candidate['name']]
        # Ensure that the initiator role of the candidate is precast
        if candidate_definition['initiator'] not in candidate['bindings']['roles']:
            raise errors.VivCompileError(
                f"Action selector '{action_selector_definition['name']}' fails to precast the initiator role "
                f"'{candidate_definition['initiator']}' for candidate '{candidate_definition['name']}'"
            )
        # Furthermore, ensure that the selector initiator is precast in the initiator role of the candidate,
        # which we  detect as an entity reference anchored in that role, with no path and no other properties.
        initiator_candidate_expression = candidate['bindings']['roles'][candidate_definition['initiator']]
        if not (
            initiator_candidate_expression['type'] == external_types.ExpressionDiscriminator.ENTITY_REFERENCE and
            initiator_candidate_expression['value']['anchor'] == action_selector_definition['initiator'] and
            not initiator_candidate_expression['value']['path'] and
            not initiator_candidate_expression['value']['local'] and
            not initiator_candidate_expression['value']['group']
        ):
            raise errors.VivCompileError(
                msg=(
                    f"Action selector '{action_selector_definition['name']}' fails to directly precast "
                    f"its initiator role '{action_selector_definition['initiator']}' in the corresponding "
                    f"initiator role '{candidate_definition['initiator']}' for candidate "
                    f"'{candidate_definition['name']}' (the initiator roles must line up directly): "
                    f"{initiator_candidate_expression['source']['code']}"
                ),
                source=initiator_candidate_expression['source'],
            )


def validate_plan_selector_definitions(*, content_bundle: external_types.ContentBundle) -> None:
    """Validate the plan-selector definitions in the given compiled content bundle.

    Args:
        content_bundle: A compiled content bundle.

    Returns:
        None. Only returns if no issue was detected downstream.
    """
    for plan_selector_definition in content_bundle["planSelectors"].values():
        # Validate general issues that pertain to all construct types
        validate_common_concerns(construct_definition=plan_selector_definition, content_bundle=content_bundle)
        # Ensure that selector candidates are all defined
        _detect_undefined_plan_selector_candidate(
            plan_selector_definition=plan_selector_definition,
            content_bundle=content_bundle
        )
        # Validate issues that pertain to both selector types
        _validate_selector_common_concerns(
            selector_definition=plan_selector_definition,
            selector_type=plan_selector_definition['type'],
            content_bundle=content_bundle
        )
    # Detect any cycle among plan selectors
    _detect_plan_selector_candidate_cycle(content_bundle=content_bundle)


def _detect_undefined_plan_selector_candidate(
    *,
    plan_selector_definition: external_types.PlanSelectorDefinition,
    content_bundle: external_types.ContentBundle
) -> None:
    """Ensure that all the given plan selector's candidates are defined plans and/or plan selectors.

    Args:
        plan_selector_definition: The plan-selector definition to validate.
        content_bundle: The compiled content bundle containing the plan-selector definition.

    Returns:
        None.

    Raises:
        VivCompileError: Plan selector targets undefined plan selector.
        VivCompileError: Plan selector targets undefined plan.
    """
    for candidate in plan_selector_definition["candidates"]:
        if candidate["isSelector"]:
            if not any(selector['name'] == candidate['name'] for selector in content_bundle["planSelectors"].values()):
                raise errors.VivCompileError(
                    f"Plan selector '{plan_selector_definition['name']}' targets undefined "
                    f"plan selector: '{candidate['name']}'"
                )
        elif not any(plan['name'] == candidate['name'] for plan in content_bundle["plans"].values()):
            raise errors.VivCompileError(
                f"Plan selector '{plan_selector_definition['name']}' targets undefined plan: '{candidate['name']}'"
            )


def _detect_plan_selector_candidate_cycle(*, content_bundle: external_types.ContentBundle) -> None:
    """Throws an error if there is a cycle among the plan-selector definitions in the given content bundle.

    A selector can yield a cycle when it targets itself, or when it targets another selector
    that directly or indirectly ends up targeting the original selector.

    Args:
        content_bundle: A compiled content bundle.

    Returns:
        None. Only returns if there's no cycle.

    Raises:
        VivCompileError: Plan selector targets itself.
        VivCompileError: Cycle among plan selectors.
    """
    # Build adjacency graph
    adjacency_graph = {plan_selector_name: set() for plan_selector_name in content_bundle["planSelectors"]}
    for selector_definition in content_bundle["planSelectors"].values():
        for candidate in selector_definition["candidates"]:
            if candidate["isSelector"]:
                if candidate["name"] == selector_definition["name"]:
                    raise errors.VivCompileError(
                        f"Plan selector '{selector_definition['name']}' directly targets itself "
                        f"(prohibited because it would yield an infinite loop during targeting)"
                    )
                adjacency_graph[selector_definition['name']].add(candidate["name"])
    # Attempt to select an indirect cycle
    cycle = detect_cycle_in_graph(adjacency_graph=adjacency_graph)
    if cycle:
        cycle_str = "'" + "' > '".join(cycle) + "'"
        raise errors.VivCompileError(
            f"Cycle detected among plan selectors: {cycle_str} "
            f"(prohibited because such cycles make selector targeting impossible to resolve)"
        )


def _validate_selector_common_concerns(
    *,
    selector_definition: external_types.ActionSelectorDefinition | external_types.PlanSelectorDefinition,
    selector_type: external_types.ConstructDiscriminator,
    content_bundle: external_types.ContentBundle
) -> None:
    """Validate the given selector definition (action selector or plan selector) along several concerns
    that are common to both selector types.

    Args:
        selector_definition: The selector definition to validate. This is typed as the selector base
            class due to some weirdness in the type checker, which doesn't understand that the
            actual selector classes inheriting from this base class have all its properties.
        content_bundle: The compiled content bundle containing the selector definition.

    Returns:
        None. Only returns if no issue was detected downstream.
    """
    _validate_selector_candidate_names(selector_definition=selector_definition, selector_type=selector_type)
    _validate_selector_candidate_weights(selector_definition=selector_definition, selector_type=selector_type)
    _validate_selector_precast_bindings(
        selector_definition=selector_definition,
        selector_type=selector_type,
        content_bundle=content_bundle
    )


def _validate_selector_candidate_names(
    *,
    selector_definition: external_types.ActionSelectorDefinition | external_types.PlanSelectorDefinition,
    selector_type: external_types.ConstructDiscriminator,
) -> None:
    """Validate the candidate names in the given selector definition.

    Args:
        selector_definition: The selector definition to validate.
        selector_type: Construct discriminator for the selector.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: A duplicate candidate name was encountered.
    """
    for i, candidate in enumerate(selector_definition['candidates']):
        for j, other_candidate in enumerate(selector_definition['candidates']):
            if i == j:
                continue
            if candidate['name'] == other_candidate['name']:
                if candidate['isSelector'] == other_candidate['isSelector']:
                    raise errors.VivCompileError(
                        f"{utils.CONSTRUCT_LABEL[selector_type]} "
                        f"'{selector_definition['name']}' has duplicate candidate name: "
                        f"'{'selector ' if candidate['isSelector'] else ''}{candidate['name']}'"
                    )


def _validate_selector_candidate_weights(
    *,
    selector_definition: external_types.ActionSelectorDefinition | external_types.PlanSelectorDefinition,
    selector_type: external_types.ConstructDiscriminator
) -> None:
    """Validate the use of candidate weights in the given selector definition.

    Args:
        selector_definition: The selector definition to validate.
        selector_type: Construct discriminator for the selector.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: Weighted selector has candidate without a weight.
        VivCompileError: Non-numeric weight expression.
        VivCompileError: Negative weight.
        VivCompileError: Weight on candidate in non-weighted selector.
    """
    for candidate in selector_definition['candidates']:
        candidate: external_types.SelectorCandidate
        # If the selector uses the weighted-random policy, ensure that the candidate has a valid associated weight
        if selector_definition['policy'] == external_types.SelectorPolicy.WEIGHTED:
            if not candidate['weight']:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[selector_type]} '{selector_definition['name']}' "
                    f"uses weighted-random targeting policy, but candidate '{candidate['name']}' "
                    f"has not been attributed a weight"
                )
            elif is_non_numeric_expression(expression=candidate['weight']):
                raise errors.VivCompileError(
                    msg=(
                        f"{utils.CONSTRUCT_LABEL[selector_type]} '{selector_definition['name']}' "
                        f"uses an invalid expression type to specify the weight for candidate "
                        f"'{candidate['name']}' (value will be non-numeric): "
                        f"{candidate['weight']['source']['code']}"
                    ),
                    source=candidate['weight']['source'],
                )
            elif candidate['weight']['type'] in (
                    external_types.ExpressionDiscriminator.FLOAT,
                    external_types.ExpressionDiscriminator.INT
            ):
                if candidate['weight']['value'] < 0:
                    raise errors.VivCompileError(
                        msg=(
                            f"{utils.CONSTRUCT_LABEL[selector_type]} "
                            f"'{selector_definition['name']}' has negative weight for candidate "
                            f"'{candidate['name']}' (weights must be zero or greater): "
                            f"{candidate['weight']['source']['code']}"
                        ),
                        source=candidate['weight']['source'],
                    )
        elif candidate['weight']:
            # Otherwise, ensure that the candidate does not have an associated weight
            raise errors.VivCompileError(
                f"{utils.CONSTRUCT_LABEL[selector_type]} '{selector_definition['name']}' "
                f"does not use the weighted-random targeting policy, but candidate "
                f"'{candidate['name']}' has still been attributed a weight"
            )


def _validate_selector_precast_bindings(
    *,
    selector_definition: external_types.ActionSelectorDefinition | external_types.PlanSelectorDefinition,
    selector_type: external_types.ConstructDiscriminator,
    content_bundle: external_types.ContentBundle
) -> None:
    """Validate the precast bindings passed onto the respective candidates in the given selector definition.

    Args:
        selector_definition: The selector definition to validate.
        selector_type: Construct discriminator for the selector.
        content_bundle: The compiled content bundle containing the selector definition.

    Returns:
        None. Only returns if no issue is encountered.

    Raises:
        VivCompileError: Unexpected construct type for selector.
        VivCompileError: Candidate fails to cast required role.
        VivCompileError: Candidate fails to precast a precast role.
        VivCompileError: Candidate precasts role not in target.
    """
    for candidate in selector_definition['candidates']:
        candidate: external_types.SelectorCandidate
        if selector_type == external_types.ConstructDiscriminator.ACTION_SELECTOR:
            if candidate['isSelector']:
                candidate_definition = content_bundle['actionSelectors'][candidate['name']]
            else:
                candidate_definition = content_bundle['actions'][candidate['name']]
        elif selector_type == external_types.ConstructDiscriminator.PLAN_SELECTOR:
            if candidate['isSelector']:
                candidate_definition = content_bundle['planSelectors'][candidate['name']]
            else:
                candidate_definition = content_bundle['plans'][candidate['name']]
        else:
            raise errors.VivCompileError(
                f"Unexpected construct type for selector: '{selector_type}'"
            )
        # Detect missing required roles
        if not candidate['bindings']['partial']:
            for role_definition in candidate_definition["roles"].values():
                if role_definition['min'] > 0:
                    if role_definition['name'] not in candidate['bindings']['roles']:
                        raise errors.VivCompileError(
                            f"{utils.CONSTRUCT_LABEL[selector_type]} "
                            f"'{selector_definition['name']}' fails to cast required role "
                            f"'{role_definition['name']}' in bindings for candidate '{candidate['name']}' "
                            f"(use 'partial' to pass a partial cast)"
                        )
        # Detect missing precast roles
        for role_definition in candidate_definition['roles'].values():
            if role_definition['precast']:
                if role_definition['name'] not in candidate['bindings']['roles']:
                    raise errors.VivCompileError(
                        f"{utils.CONSTRUCT_LABEL[selector_type]} "
                        f"'{selector_definition['name']}' fails to precast a 'precast' role "
                        f"for candidate '{candidate['name']}': '{role_definition['name']}'"
                    )
        # Detect extra roles
        for role_name in candidate['bindings']['roles']:
            if role_name not in candidate_definition['roles']:
                raise errors.VivCompileError(
                    f"{utils.CONSTRUCT_LABEL[selector_type]} "
                    f"'{selector_definition['name']}' precasts role '{role_name}' in "
                    f"bindings for candidate '{candidate['name']}', but candidate has no role by that name"
                )
