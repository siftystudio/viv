"""Test compilation of Viv action inheritance."""

import pytest

from viv_compiler import VivCompileError, compile_from_path

from .conftest import INVALID_FIXTURES_SEMANTICS_SUBDIR, VALID_FIXTURES_SUBDIR, VALID_INCLUDES_SUBDIR


def test_inheritance_basic_child_inherits_roles() -> None:
    """Compile the <inheritance_basic> fixture and check role inheritance."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "inheritance_basic.viv")
    action = bundle["actions"]["compliment"]
    assert "speaker" in action["roles"]
    assert "listener" in action["roles"]


def test_inheritance_basic_child_overrides_gloss() -> None:
    """Compile the <inheritance_basic> fixture and check that the child's gloss overrides the parent's."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "inheritance_basic.viv")
    action = bundle["actions"]["compliment"]
    assert action["gloss"] is not None
    assert "compliment" in str(action["gloss"]["value"]).lower() or "@speaker" in str(action["gloss"])


def test_inheritance_basic_child_inherits_importance() -> None:
    """Compile the <inheritance_basic> fixture and check that importance cascades from the parent."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "inheritance_basic.viv")
    action = bundle["actions"]["compliment"]
    assert action["importance"]["value"] == 2.0


def test_inheritance_template_deleted() -> None:
    """Compile the <inheritance_basic> fixture and check that the template is deleted from the bundle."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "inheritance_basic.viv")
    assert "base-verbal" not in bundle["actions"]
    assert "compliment" in bundle["actions"]


def test_inheritance_join_tags_retains_parent_tags() -> None:
    """Compile the <inheritance_join_tags> fixture and check that `join tags:` merges rather than replaces."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "inheritance_join_tags.viv")
    action = bundle["actions"]["friendly-greeting"]
    tag_values = [t["value"] for t in action["tags"]["value"]]
    assert "social" in tag_values
    assert "interaction" in tag_values
    assert "greeting" in tag_values
    assert "friendly" in tag_values


def test_inheritance_join_roles_merges_parent_and_child_roles() -> None:
    """Compile the <inheritance_join_roles> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "inheritance_join_roles.viv")
    action = bundle["actions"]["public-speech"]
    assert "speaker" in action["roles"]
    assert "listener" in action["roles"]
    assert "audience" in action["roles"]
    assert action["roles"]["audience"]["max"] == 10


def test_inheritance_join_conditions_retains_parent_conditions() -> None:
    """Compile the <inheritance_join_conditions> fixture and check conditions from both levels."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "inheritance_join_conditions.viv")
    action = bundle["actions"]["extra-guarded"]
    conditions = action["conditions"]
    all_conditions = list(conditions["globalConditions"])
    for condition_group in conditions["roleConditions"].values():
        all_conditions.extend(condition_group)
    assert len(all_conditions) >= 2


def test_inheritance_join_effects_retains_parent_effects() -> None:
    """Compile the <inheritance_join_effects> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "inheritance_join_effects.viv")
    action = bundle["actions"]["enhanced-effect"]
    effects = action["effects"]
    assert len(effects) >= 2


def test_inheritance_join_reactions_retains_parent_reactions() -> None:
    """Compile the <inheritance_join_reactions> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "inheritance_join_reactions.viv")
    action = bundle["actions"]["extra-reactive"]
    reactions = action["reactions"]
    reaction_targets = [r["body"]["value"]["targetName"] for r in reactions]
    assert "helper" in reaction_targets
    assert "supporter" in reaction_targets


def test_inheritance_role_rename() -> None:
    """Compile the <inheritance_role_rename> fixture and check that references are rewritten."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "inheritance_role_rename.viv")
    action = bundle["actions"]["gift"]
    assert "donor" in action["roles"]
    assert "giver" not in action["roles"]
    assert "receiver" in action["roles"]
    assert action["initiator"] == "donor"
    role_conditions = action["conditions"]["roleConditions"]
    assert "donor" in role_conditions


def test_inheritance_three_level_chain() -> None:
    """Compile the <inheritance_three_level> fixture and check three-level field cascading."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "inheritance_three_level.viv")
    action = bundle["actions"]["child-act"]
    assert "grandparent-act" not in bundle["actions"]
    assert "parent-act" not in bundle["actions"]
    assert "actor" in action["roles"]
    assert action["importance"]["value"] == 5.0
    tag_values = [t["value"] for t in action["tags"]["value"]]
    assert "base-tag" in tag_values
    assert action["gloss"] is not None


def test_cross_file_inheritance() -> None:
    """Compile the <cross_file_inheritance_entry> include fixture and check cross-file parent resolution."""
    bundle = compile_from_path(
        source_file_path=VALID_INCLUDES_SUBDIR / "cross_file_inheritance_entry.viv"
    )
    action = bundle["actions"]["derived-action"]
    assert "imported-base" not in bundle["actions"]
    assert "actor" in action["roles"]
    assert "target" in action["roles"]
    assert action["importance"]["value"] == 3.0
    assert action["gloss"] is not None


def test_rename_with_other_fields() -> None:
    """Check that a renaming role with extra fields (e.g., `as:`) is rejected.

    The `renames` directive means "give this inherited role a new name" — no other fields
    should be present.
    """
    with pytest.raises(VivCompileError, match="(?s)renames"):
        compile_from_path(
            source_file_path=INVALID_FIXTURES_SEMANTICS_SUBDIR / "rename_with_other_fields.viv"
        )


def test_rename_sibling_role() -> None:
    """Check that renaming a role defined in the same child block (not inherited) is rejected."""
    with pytest.raises(VivCompileError):
        compile_from_path(
            source_file_path=INVALID_FIXTURES_SEMANTICS_SUBDIR / "rename_sibling_role.viv"
        )
