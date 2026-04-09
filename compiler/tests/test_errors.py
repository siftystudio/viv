"""Test that invalid .viv fixtures produce the expected errors."""

from pathlib import Path

import pytest

from viv_compiler import VivCompileError, VivParseError, compile_from_path

from .conftest import (
    INVALID_FIXTURES_SEMANTICS,
    INVALID_FIXTURES_SEMANTICS_SUBDIR,
    INVALID_FIXTURES_SYNTAX,
    get_fixture_id,
)


@pytest.mark.parametrize("fixture_path", INVALID_FIXTURES_SYNTAX, ids=get_fixture_id)
def test_invalid_syntax_raises_parse_error(fixture_path: Path) -> None:
    """Run each invalid-syntax fixture and check that it raises `VivParseError`."""
    with pytest.raises(VivParseError):
        compile_from_path(source_file_path=fixture_path)


@pytest.mark.parametrize("fixture_path", INVALID_FIXTURES_SEMANTICS, ids=get_fixture_id)
def test_invalid_semantics_raises_compile_error(fixture_path: Path) -> None:
    """Run each invalid-semantics fixture and check that it raises `VivCompileError`."""
    with pytest.raises(VivCompileError):
        compile_from_path(source_file_path=fixture_path)


def test_duplicate_action_name_error_message() -> None:
    """Check the error message for a duplicate action name."""
    with pytest.raises(VivCompileError, match="(?si)duplicate.*action.*greet"):
        compile_from_path(source_file_path=INVALID_FIXTURES_SEMANTICS_SUBDIR / "duplicate_action_name.viv")


def test_duplicate_role_name_error_message() -> None:
    """Check the error message for a duplicate role name."""
    with pytest.raises(VivCompileError, match="(?si)duplicate.*role.*person"):
        compile_from_path(source_file_path=INVALID_FIXTURES_SEMANTICS_SUBDIR / "duplicate_role_name.viv")


def test_error_message_inheritance_cycle() -> None:
    """Check the error message for an inheritance cycle names the participating actions."""
    with pytest.raises(VivCompileError, match="(?si)cycle.*cycle-a.*cycle-b|cycle.*cycle-b.*cycle-a"):
        compile_from_path(source_file_path=INVALID_FIXTURES_SEMANTICS_SUBDIR / "inheritance_cycle.viv")


def test_error_message_undefined_parent_action() -> None:
    """Check the error message for an undefined parent action names both child and parent."""
    with pytest.raises(VivCompileError, match="(?si)orphan.*nonexistent-parent"):
        compile_from_path(source_file_path=INVALID_FIXTURES_SEMANTICS_SUBDIR / "undefined_parent_action.viv")


def test_error_message_plan_action_temporal_anchor() -> None:
    """Check the error message for `from ACTION` in a plan mentions `from now`."""
    with pytest.raises(VivCompileError, match="(?si)from now"):
        compile_from_path(source_file_path=INVALID_FIXTURES_SEMANTICS_SUBDIR / "plan_action_temporal_anchor.viv")


def test_error_message_duplicate_salience_role() -> None:
    """Check the error message for a duplicate salience role entry names the role."""
    with pytest.raises(VivCompileError, match="(?si)duplicate.*salience.*target"):
        compile_from_path(source_file_path=INVALID_FIXTURES_SEMANTICS_SUBDIR / "duplicate_salience_role.viv")


def test_error_message_bare_character_role_in_action() -> None:
    """Check the error message for a bare character role in an action names the role and mentions participation mode."""
    with pytest.raises(VivCompileError, match="(?si)animal.*participation mode"):
        compile_from_path(source_file_path=INVALID_FIXTURES_SEMANTICS_SUBDIR / "bare_character_role_in_action.viv")


def test_error_message_precast_on_non_reserved() -> None:
    """Check the error message for `precast` on a non-reserved action mentions `reserved`."""
    with pytest.raises(VivCompileError, match="(?si)reserved"):
        compile_from_path(source_file_path=INVALID_FIXTURES_SEMANTICS_SUBDIR / "precast_on_non_reserved.viv")


def test_error_message_reaction_missing_bindings() -> None:
    """Check the error message for a reaction without bindings suggests `with none`."""
    with pytest.raises(VivCompileError, match="(?si)with none"):
        compile_from_path(source_file_path=INVALID_FIXTURES_SEMANTICS_SUBDIR / "reaction_without_bindings.viv")


def test_error_message_special_role_hearer_in_conditions() -> None:
    """Check the error message for `@hearer` in conditions names the special role."""
    with pytest.raises(VivCompileError, match="(?si)special role.*@hearer.*conditions"):
        compile_from_path(source_file_path=INVALID_FIXTURES_SEMANTICS_SUBDIR / "special_role_hearer_in_conditions.viv")


def test_error_message_special_role_this_in_conditions() -> None:
    """Check the error message for `@this` in conditions names the special role."""
    with pytest.raises(VivCompileError, match="(?si)special role.*@this.*conditions"):
        compile_from_path(source_file_path=INVALID_FIXTURES_SEMANTICS_SUBDIR / "special_role_this_in_conditions.viv")


def test_error_message_selector_candidate_missing_initiator() -> None:
    """Check the error message for a selector candidate without an initiator role."""
    with pytest.raises(VivCompileError, match="(?si)initiator"):
        compile_from_path(source_file_path=INVALID_FIXTURES_SEMANTICS_SUBDIR / "selector_candidate_missing_initiator.viv")


def test_pointer_as_first_path_component_is_semantic_error() -> None:
    """Check that `@actor->mood` raises `VivCompileError`, not `VivParseError`.

    The grammar should accept `@a->foo` and let validation reject it, so that the user
    gets a semantic error message rather than a confusing parse failure.
    """
    try:
        compile_from_path(
            source_file_path=INVALID_FIXTURES_SEMANTICS_SUBDIR / "pointer_as_first_path_component.viv"
        )
        raise AssertionError("Expected VivCompileError but compilation succeeded")
    except VivParseError:
        raise AssertionError(
            "Got VivParseError (parse failure) instead of VivCompileError (semantic rejection). "
            "The grammar should accept @a->foo and let validation reject it."
        )
    except VivCompileError:
        pass


def test_compile_error_file_path_is_absolute() -> None:
    """Verify that `VivCompileError.file_path` is absolute for the <action_missing_roles> fixture."""
    with pytest.raises(VivCompileError) as exc_info:
        compile_from_path(source_file_path=INVALID_FIXTURES_SEMANTICS_SUBDIR / "action_missing_roles.viv")
    assert exc_info.value.file_path is not None
    assert exc_info.value.file_path.is_absolute()
