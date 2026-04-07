"""Test compilation of Viv action-selector and plan-selector constructs."""

from viv_compiler import compile_from_path

from .conftest import VALID_FIXTURES_SUBDIR


def test_plan_selector_with_roles() -> None:
    """Compile the <plan_selector_with_roles> fixture (Bug 6)."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "plan_selector_with_roles.viv")
    assert "choose-strategy" in bundle["planSelectors"]
    assert "leader" in bundle["planSelectors"]["choose-strategy"]["roles"]


def test_action_selector_without_roles() -> None:
    """Compile the <action_selector_without_roles> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "action_selector_without_roles.viv")
    assert "choose-greeting" in bundle["actionSelectors"]
    roles = bundle["actionSelectors"]["choose-greeting"]["roles"]
    assert "__initiator__" in roles


def test_action_selector_all_permitted_role_labels() -> None:
    """Compile the <action_selector_with_participation_mode_roles> fixture.

    Exercises every role label in `ROLE_LABELS_PERMITTED_IN_CONSTRUCT_OF_TYPE[ACTION_SELECTOR]`
    to guard against accidental omissions.
    """
    bundle = compile_from_path(
        source_file_path=VALID_FIXTURES_SUBDIR / "action_selector_with_participation_mode_roles.viv"
    )
    selector = bundle["actionSelectors"]["comprehensive-selector"]
    roles = selector["roles"]
    assert roles["actor"]["participationMode"] == "initiator"
    assert roles["helper"]["participationMode"] == "partner"
    assert roles["victim"]["participationMode"] == "recipient"
    assert roles["witness"]["participationMode"] == "bystander"
    assert roles["observer"]["entityType"] == "character"
    assert roles["tool"]["entityType"] == "item"
    assert roles["venue"]["entityType"] == "location"
    assert roles["past-event"]["entityType"] == "action"
    assert roles["marker"]["entityType"] == "symbol"
    assert roles["observer"]["anywhere"] is True
    assert roles["precast-target"]["precast"] is True


def test_selector_weighted_policy() -> None:
    """Compile the <selector_weighted> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "selector_weighted.viv")
    selector = bundle["actionSelectors"]["social-choice"]
    assert selector["policy"] == "weighted"
    assert len(selector["candidates"]) == 2
    chat_candidate = next(c for c in selector["candidates"] if c["name"] == "chat")
    assert chat_candidate["weight"] is not None
    assert chat_candidate["weight"]["value"] == 3
    argue_candidate = next(c for c in selector["candidates"] if c["name"] == "argue")
    assert argue_candidate["weight"]["value"] == 1


def test_selector_ordered_policy() -> None:
    """Compile the <selector_ordered> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "selector_ordered.viv")
    selector = bundle["actionSelectors"]["task-priority"]
    assert selector["policy"] == "ordered"
    assert selector["candidates"][0]["name"] == "primary-task"
    assert selector["candidates"][1]["name"] == "fallback-task"


def test_selector_with_sub_selector() -> None:
    """Compile the <selector_with_sub_selector> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "selector_with_sub_selector.viv")
    selector = bundle["actionSelectors"]["meta-greeting"]
    sub_selector_candidate = next(c for c in selector["candidates"] if c["name"] == "basic-greeting")
    assert sub_selector_candidate["isSelector"] is True
    action_candidate = next(c for c in selector["candidates"] if c["name"] == "wave")
    assert action_candidate["isSelector"] is False
