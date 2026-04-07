"""Test compilation of Viv association blocks."""

from viv_compiler import compile_from_path

from .conftest import VALID_FIXTURES_SUBDIR


def test_associations_structure() -> None:
    """Compile the <action_with_associations> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "action_with_associations.viv")
    action = bundle["actions"]["negotiate"]
    associations = action["associations"]
    default_tags = [t["value"] for t in associations["default"]["value"]]
    assert "commerce" in default_tags
    assert "routine" in default_tags
    assert "buyer" in associations["roles"]
    assert "seller" in associations["roles"]
    assert len(associations["custom"]) > 0
    assert associations["variable"] is not None


def test_associations_elif() -> None:
    """Compile the <associations_elif> fixture with elif branches."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "associations_elif.viv")
    associations = bundle["actions"]["evaluate-candidate"]["associations"]
    assert len(associations["custom"]) > 0
    conditional = associations["custom"][0]
    assert conditional["type"] == "conditional"
    assert len(conditional["value"]["branches"]) == 2
    assert conditional["value"]["alternative"] is not None
