"""Test compilation of Viv sifting-pattern constructs."""

import pytest

from viv_compiler import VivCompileError, compile_from_path

from .conftest import INVALID_FIXTURES_SEMANTICS_SUBDIR, VALID_FIXTURES_SUBDIR


def test_sifting_pattern_structure() -> None:
    """Compile the <sifting_pattern> fixture and check roles and actions."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "sifting_pattern.viv")
    pattern = bundle["siftingPatterns"]["betrayal-pattern"]
    assert "perpetrator" in pattern["roles"]
    assert "injured-party" in pattern["roles"]
    assert "act1" in pattern["roles"]
    assert "act2" in pattern["roles"]
    assert "act1" in pattern["actions"]
    assert "act2" in pattern["actions"]
    assert pattern["roles"]["act1"]["entityType"] == "action"
    assert pattern["roles"]["act2"]["entityType"] == "action"


def test_sifting_pattern_group_action_role_structure() -> None:
    """Compile the <sifting_pattern_group_action_role> fixture and check group action role min/max."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "sifting_pattern_group_action_role.viv")
    pattern = bundle["siftingPatterns"]["prank-spree"]
    # Group action role should have correct min/max
    pranks_role = pattern["roles"]["pranks"]
    assert pranks_role["entityType"] == "action"
    assert pranks_role["min"] == 2
    assert pranks_role["max"] == 50
    # Singleton action role should retain defaults
    apology_role = pattern["roles"]["apology"]
    assert apology_role["entityType"] == "action"
    assert apology_role["min"] == 1
    assert apology_role["max"] == 1
    # Both should appear in the actions list
    assert "pranks" in pattern["actions"]
    assert "apology" in pattern["actions"]


def test_sifting_pattern_group_action_role_in_relation_error() -> None:
    """Run the <sifting_group_action_role_in_relation> fixture and check the error message."""
    with pytest.raises(VivCompileError, match="(?si)group.*role.*@steps.*preceded"):
        compile_from_path(
            source_file_path=INVALID_FIXTURES_SEMANTICS_SUBDIR / "sifting_group_action_role_in_relation.viv"
        )
