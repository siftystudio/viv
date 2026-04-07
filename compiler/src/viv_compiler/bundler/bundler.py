"""Handles construction of the finalized compiled content bundle."""

__all__ = ["create_compiled_content_bundle"]

from viv_compiler import external_types, internal_types
from ._metadata import create_metadata


def create_compiled_content_bundle(*, combined_ast: internal_types.CombinedAST) -> external_types.ContentBundle:
    """Return a finalized compiled content bundle that is ready for validation.

    Args:
        combined_ast: A combined AST that has undergone all postprocessing.

    Returns:
        A finalized compiled content bundle that is ready for validation.
    """
    # Create metadata to be attached to the compiled content bundle
    content_bundle_metadata = create_metadata(combined_ast=combined_ast)
    # Create the finalized construct definitions
    action_definitions = _create_action_definitions(combined_ast=combined_ast)
    action_selector_definitions = _create_action_selector_definitions(combined_ast=combined_ast)
    plan_definitions = _create_plan_definitions(combined_ast=combined_ast)
    plan_selector_definitions = _create_plan_selector_definitions(combined_ast=combined_ast)
    query_definitions = _create_query_definitions(combined_ast=combined_ast)
    sifting_pattern_definitions = _create_sifting_pattern_definitions(combined_ast=combined_ast)
    trope_definitions = _create_trope_definitions(combined_ast=combined_ast)
    # Package up and return the compiled content bundle
    compiled_content_bundle = external_types.ContentBundle(
        metadata=content_bundle_metadata,
        actions=action_definitions,
        actionSelectors=action_selector_definitions,
        plans=plan_definitions,
        queries=query_definitions,
        siftingPatterns=sifting_pattern_definitions,
        planSelectors=plan_selector_definitions,
        tropes=trope_definitions
    )
    return compiled_content_bundle


def _create_action_definitions(
    *,
    combined_ast: internal_types.CombinedAST
) -> dict[external_types.ActionName, external_types.ActionDefinition]:
    """Return a dictionary mapping action names to (finalized) action definitions.

    Args:
        combined_ast: A combined AST that has undergone all postprocessing.

    Returns:
        A dictionary mapping action names to (finalized) action definitions.
    """
    action_definitions: dict[external_types.ActionName, external_types.ActionDefinition] = {}
    for intermediate_action_definition in combined_ast["actions"]:
        action_definition = external_types.ActionDefinition(
            type=intermediate_action_definition["type"],
            name=intermediate_action_definition["name"],
            reserved=intermediate_action_definition["reserved"],
            roles=intermediate_action_definition["roles"],
            initiator=intermediate_action_definition["initiator"],
            roleForestRoots=intermediate_action_definition["roleForestRoots"],
            importance=intermediate_action_definition["importance"],
            tags=intermediate_action_definition["tags"],
            gloss=intermediate_action_definition["gloss"],
            report=intermediate_action_definition["report"],
            conditions=intermediate_action_definition["conditions"],
            scratch=intermediate_action_definition["scratch"],
            effects=intermediate_action_definition["effects"],
            reactions=intermediate_action_definition["reactions"],
            saliences=intermediate_action_definition["saliences"],
            associations=intermediate_action_definition["associations"],
            embargoes=intermediate_action_definition["embargoes"],
        )
        action_definitions[intermediate_action_definition["name"]] = action_definition
    return action_definitions


def _create_action_selector_definitions(
    *,
    combined_ast: internal_types.CombinedAST
) -> dict[external_types.SelectorName, external_types.ActionSelectorDefinition]:
    """Return a dictionary mapping action-selector names to (finalized) action-selector definitions.

    Args:
        combined_ast: A combined AST that has undergone all postprocessing.

    Returns:
        A dictionary mapping action-selector names to (finalized) action-selector definitions.
    """
    action_selector_definitions: dict[external_types.SelectorName, external_types.ActionSelectorDefinition] = {}
    for intermediate_action_selector_definition in combined_ast["actionSelectors"]:
        action_selector_definition = external_types.ActionSelectorDefinition(
            type=intermediate_action_selector_definition["type"],
            name=intermediate_action_selector_definition["name"],
            reserved=intermediate_action_selector_definition["reserved"],
            roles=intermediate_action_selector_definition["roles"],
            initiator=intermediate_action_selector_definition["initiator"],
            roleForestRoots=intermediate_action_selector_definition["roleForestRoots"],
            conditions=intermediate_action_selector_definition["conditions"],
            policy=intermediate_action_selector_definition["policy"],
            candidates=intermediate_action_selector_definition["candidates"]
        )
        action_selector_definitions[intermediate_action_selector_definition["name"]] = action_selector_definition
    return action_selector_definitions


def _create_plan_definitions(
    *,
    combined_ast: internal_types.CombinedAST
) -> dict[external_types.PlanName, external_types.PlanDefinition]:
    """Return a dictionary mapping plan names to (finalized) plan definitions.

    Args:
        combined_ast: A combined AST that has undergone all postprocessing.

    Returns:
        A dictionary mapping plan names to (finalized) plan definitions.
    """
    plan_definitions: dict[external_types.PlanName, external_types.PlanDefinition] = {}
    for intermediate_plan_definition in combined_ast["plans"]:
        plan_definition = external_types.PlanDefinition(
            type=intermediate_plan_definition["type"],
            name=intermediate_plan_definition["name"],
            roles=intermediate_plan_definition["roles"],
            roleForestRoots=intermediate_plan_definition["roleForestRoots"],
            conditions=intermediate_plan_definition["conditions"],
            phases=intermediate_plan_definition["phases"],
            initialPhase=intermediate_plan_definition["initialPhase"]
        )
        plan_definitions[intermediate_plan_definition["name"]] = plan_definition
    return plan_definitions


def _create_plan_selector_definitions(
    *,
    combined_ast: internal_types.CombinedAST
) -> dict[external_types.SelectorName, external_types.PlanSelectorDefinition]:
    """Return a dictionary mapping plan-selector names to (finalized) plan-selector definitions.

    Args:
        combined_ast: A combined AST that has undergone all postprocessing.

    Returns:
        A dictionary mapping plan-selector names to (finalized) plan-selector definitions.
    """
    plan_selector_definitions: dict[external_types.SelectorName, external_types.PlanSelectorDefinition] = {}
    for intermediate_plan_selector_definition in combined_ast["planSelectors"]:
        plan_selector_definition = external_types.PlanSelectorDefinition(
            type=intermediate_plan_selector_definition["type"],
            name=intermediate_plan_selector_definition["name"],
            roles=intermediate_plan_selector_definition["roles"],
            roleForestRoots=intermediate_plan_selector_definition["roleForestRoots"],
            conditions=intermediate_plan_selector_definition["conditions"],
            policy=intermediate_plan_selector_definition["policy"],
            candidates=intermediate_plan_selector_definition["candidates"]
        )
        plan_selector_definitions[intermediate_plan_selector_definition["name"]] = plan_selector_definition
    return plan_selector_definitions


def _create_query_definitions(
    *,
    combined_ast: internal_types.CombinedAST
) -> dict[external_types.QueryName, external_types.QueryDefinition]:
    """Return a dictionary mapping query names to (finalized) query definitions.

    Args:
        combined_ast: A combined AST that has undergone all postprocessing.

    Returns:
        A dictionary mapping query names to (finalized) query definitions.
    """
    query_definitions: dict[external_types.QueryName, external_types.QueryDefinition] = {}
    for intermediate_query_definition in combined_ast["queries"]:
        query_definition = external_types.QueryDefinition(
            type=intermediate_query_definition["type"],
            name=intermediate_query_definition["name"],
            roles=intermediate_query_definition["roles"],
            roleForestRoots=intermediate_query_definition["roleForestRoots"],
            conditions=intermediate_query_definition["conditions"],
            actionName=intermediate_query_definition["actionName"],
            ancestors=intermediate_query_definition["ancestors"],
            descendants=intermediate_query_definition["descendants"],
            importance=intermediate_query_definition["importance"],
            tags=intermediate_query_definition["tags"],
            salience=intermediate_query_definition["salience"],
            associations=intermediate_query_definition["associations"],
            location=intermediate_query_definition["location"],
            time=intermediate_query_definition["time"],
            initiator=intermediate_query_definition["initiator"],
            partners=intermediate_query_definition["partners"],
            recipients=intermediate_query_definition["recipients"],
            bystanders=intermediate_query_definition["bystanders"],
            active=intermediate_query_definition["active"],
            present=intermediate_query_definition["present"]
        )
        query_definitions[intermediate_query_definition["name"]] = query_definition
    return query_definitions


def _create_sifting_pattern_definitions(
    *,
    combined_ast: internal_types.CombinedAST
) -> dict[external_types.SiftingPatternName, external_types.SiftingPatternDefinition]:
    """Return a dictionary mapping sifting-pattern names to (finalized) sifting-pattern definitions.

    Args:
        combined_ast: A combined AST that has undergone all postprocessing.

    Returns:
        A dictionary mapping sifting-pattern names to (finalized) sifting-pattern definitions.
    """
    sifting_pattern_definitions: dict[
        external_types.SiftingPatternName,
        external_types.SiftingPatternDefinition,
    ] = {}
    for intermediate_sifting_pattern_definition in combined_ast["siftingPatterns"]:
        sifting_pattern_definition = external_types.SiftingPatternDefinition(
            type=intermediate_sifting_pattern_definition["type"],
            name=intermediate_sifting_pattern_definition["name"],
            roles=intermediate_sifting_pattern_definition["roles"],
            roleForestRoots=intermediate_sifting_pattern_definition["roleForestRoots"],
            conditions=intermediate_sifting_pattern_definition["conditions"],
            actions=intermediate_sifting_pattern_definition["actions"]
        )
        sifting_pattern_definitions[intermediate_sifting_pattern_definition["name"]] = sifting_pattern_definition
    return sifting_pattern_definitions


def _create_trope_definitions(
    *,
    combined_ast: internal_types.CombinedAST
) -> dict[external_types.TropeName, external_types.TropeDefinition]:
    """Return a dictionary mapping trope names to (finalized) trope definitions.

    Args:
        combined_ast: A combined AST that has undergone all postprocessing.

    Returns:
        A dictionary mapping trope names to (finalized) trope definitions.
    """
    trope_definitions: dict[external_types.TropeName, external_types.TropeDefinition] = {}
    for intermediate_trope_definition in combined_ast["tropes"]:
        trope_definition = external_types.TropeDefinition(
            type=intermediate_trope_definition["type"],
            name=intermediate_trope_definition["name"],
            roles=intermediate_trope_definition["roles"],
            roleForestRoots=intermediate_trope_definition["roleForestRoots"],
            conditions=intermediate_trope_definition["conditions"]
        )
        trope_definitions[intermediate_trope_definition["name"]] = trope_definition
    return trope_definitions
