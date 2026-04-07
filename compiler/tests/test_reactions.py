"""Test compilation of Viv reaction declarations."""

from viv_compiler import compile_from_path

from .conftest import VALID_FIXTURES_SUBDIR


def test_reaction_role_references() -> None:
    """Compile the <action_with_reactions> fixture and check role reference wrapping."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "action_with_reactions.viv")
    reactions = bundle["actions"]["provoke"]["reactions"]
    action_reactions = [reaction for reaction in reactions if reaction["body"]["value"]["targetType"] == "action"]
    assert len(action_reactions) == 1
    assert set(action_reactions[0]["references"]) == {"provoker", "target"}


def test_reaction_queue_plan() -> None:
    """Check that a reaction can queue a plan (Bug 4)."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "action_with_reactions.viv")
    reactions = bundle["actions"]["provoke"]["reactions"]
    plan_reactions = [reaction for reaction in reactions if reaction["body"]["value"]["targetType"] == "plan"]
    assert len(plan_reactions) == 1
    assert plan_reactions[0]["body"]["value"]["targetName"] == "investigate"
    assert "investigate" in bundle["plans"]


def test_reaction_queue_action_selector() -> None:
    """Check that a reaction can queue an action-selector (Bug 5)."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "action_with_reactions.viv")
    reactions = bundle["actions"]["provoke"]["reactions"]
    selector_reactions = [reaction for reaction in reactions if reaction["body"]["value"]["targetType"] == "actionSelector"]
    assert len(selector_reactions) == 1
    assert selector_reactions[0]["body"]["value"]["targetName"] == "crowd-response"
    assert "crowd-response" in bundle["actionSelectors"]


def test_reaction_repeat_logic() -> None:
    """Compile the <reaction_with_repeat_logic> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "reaction_with_repeat_logic.viv")
    reactions = bundle["actions"]["patrol"]["reactions"]
    assert len(reactions) == 1
    reaction_value = reactions[0]["body"]["value"]
    repeat_logic = reaction_value["repeatLogic"]
    assert repeat_logic is not None
    assert repeat_logic["maxRepeats"] == 3
    assert repeat_logic["conditions"] is not None
    assert len(repeat_logic["conditions"]) > 0


def test_conditional_reaction_if() -> None:
    """Compile the <conditional_reactions> fixture and check that `if:` wraps as a conditional."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "conditional_reactions.viv")
    action = bundle["actions"]["provoke-crowd"]
    reactions = action["reactions"]
    conditional_reactions = [r for r in reactions if r["body"]["type"] == "conditional"]
    assert len(conditional_reactions) >= 1
    conditional = conditional_reactions[0]["body"]
    consequent = conditional["value"]["branches"][0]["consequent"]
    assert any(expr["type"] == "reaction" for expr in consequent)


def test_conditional_reaction_loop() -> None:
    """Compile the <conditional_reactions> fixture and check that `loop:` wraps as a loop."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "conditional_reactions.viv")
    action = bundle["actions"]["provoke-crowd"]
    reactions = action["reactions"]
    loop_reactions = [r for r in reactions if r["body"]["type"] == "loop"]
    assert len(loop_reactions) >= 1
    loop = loop_reactions[0]["body"]
    assert any(expr["type"] == "reaction" for expr in loop["value"]["body"])
